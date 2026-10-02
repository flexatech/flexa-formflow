<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;
use Flexa\FormFlow\Spam\Captcha\Registry as CaptchaRegistry;
use Flexa\FormFlow\Spam\ClientFingerprint;
use Flexa\FormFlow\Spam\SpamStats;
use Flexa\FormFlow\Spam\SubmissionGuard;
use Flexa\FormFlow\Support\Settings;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * Admin tools around spam protection, kept apart from the public submit route:
 *
 * - `POST /spam/captcha/test`: checks a provider's saved keys with the
 *   provider, without any submission;
 * - `POST /forms/{id}/test-submission`: runs the submit pipeline as a dry run
 *   on sample answers and reports each step. It never creates an entry, sends
 *   an email or runs a workflow;
 * - `GET /spam/status`: blocked counts and published forms whose CAPTCHA has
 *   no keys (they reject every submission until fixed).
 */
final class SpamEndpoint extends Endpoint {
	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/spam/captcha/test',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'test_provider' ],
					'permission_callback' => [ $this, 'settings_permission' ],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/forms/(?P<id>\d+)/test-submission',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'test_submission' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [ 'id' => [ 'sanitize_callback' => 'absint' ] ],
				],
			]
		);
		register_rest_route(
			self::NAMESPACE,
			'/spam/status',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ $this, 'status' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
			]
		);
	}

	public function test_provider( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$params   = (array) $request->get_json_params();
		$provider = CaptchaRegistry::get( is_string( $params['provider'] ?? null ) ? $params['provider'] : '' );
		if ( null === $provider ) {
			return new WP_Error( 'flexa_formflow_unknown_provider', __( 'Unknown CAPTCHA provider.', 'flexa-formflow' ), [ 'status' => 400 ] );
		}

		$result = $provider->test_keys();
		if ( $result->ok ) {
			$message = __( 'The provider accepted these keys.', 'flexa-formflow' );
		} elseif ( 'not_configured' === $result->code ) {
			$message = __( 'Save both the site key and the secret key first.', 'flexa-formflow' );
		} elseif ( 'invalid_secret' === $result->code ) {
			$message = __( 'The provider rejected the secret key. Check that you copied it in full.', 'flexa-formflow' );
		} else {
			$message = __( 'The provider could not be reached. Try again in a moment.', 'flexa-formflow' );
		}

		return new WP_REST_Response(
			[
				'ok'      => $result->ok,
				'code'    => $result->code,
				'message' => $message,
			],
			200
		);
	}

	public function test_submission( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$stored = FormRepository::instance()->find( (int) $request->get_param( 'id' ) );
		if ( null === $stored ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'Form not found.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		// Test the builder's current draft (unsaved changes included) under the
		// stored form's identity, so workflows and rate limits match the real one.
		$params = (array) $request->get_json_params();
		$config = is_array( $params['config'] ?? null ) ? FieldTypes::sanitize_config( $params['config'] ) : $stored->config;
		$form   = new Form( $stored->id, $stored->uuid, $stored->title, $stored->status, $config, $stored->created_at, $stored->updated_at );
		$values = is_array( $params['fields'] ?? null ) ? $params['fields'] : [];

		return new WP_REST_Response( [ 'steps' => self::dry_run( $form, $values ) ], 200 );
	}

	/**
	 * What the form builder needs (it runs for users who may not manage
	 * settings): which providers exist and whether each has keys. Never a key.
	 */
	public function status(): WP_REST_Response {
		$providers = [];
		foreach ( CaptchaRegistry::providers() as $provider ) {
			$providers[] = [
				'id'         => $provider->id(),
				'label'      => $provider->label(),
				'configured' => $provider->is_configured(),
			];
		}

		return new WP_REST_Response(
			[
				'providers' => $providers,
				'default'   => CaptchaRegistry::coerce( Settings::get( 'captcha_default' ) ),
				'stats'     => SpamStats::all(),
				'warnings'  => self::captcha_warnings(),
			],
			200
		);
	}

	/**
	 * Published forms set to a CAPTCHA that has no keys.
	 *
	 * @return list<array{id: int, title: string, provider: string}>
	 */
	public static function captcha_warnings(): array {
		$out  = [];
		$page = FormRepository::instance()->all(
			[
				'status'   => 'published',
				'per_page' => 100,
			]
		);
		foreach ( $page['items'] as $form ) {
			$id = CaptchaRegistry::coerce( $form->settings()['captcha'] ?? CaptchaRegistry::NONE );
			if ( ! CaptchaRegistry::is_ready( $id ) ) {
				$provider = CaptchaRegistry::get( $id );
				$out[]    = [
					'id'       => $form->id,
					'title'    => $form->title,
					'provider' => null !== $provider ? $provider->label() : $id,
				];
			}
		}

		return $out;
	}

	/**
	 * Every pipeline step for these answers, without a single side effect.
	 *
	 * @param array<string, mixed> $values
	 * @return list<array{step: string, status: string, detail: string}>
	 */
	private static function dry_run( Form $form, array $values ): array {
		$steps = [
			self::step(
				'form',
				$form->is_published() ? 'pass' : 'fail',
				$form->is_published() ? __( 'The form is published.', 'flexa-formflow' ) : __( 'The form is a draft, so visitors cannot send it yet.', 'flexa-formflow' )
			),
		];

		$guard = SubmissionGuard::make()->check( $form, [], ClientFingerprint::ip(), ClientFingerprint::user_agent(), true );
		$steps = array_merge( $steps, $guard->steps );
		if ( 'reject' === $guard->verdict ) {
			return $steps;
		}

		$result  = SubmitEndpoint::validate( $form, $values );
		$labels  = [];
		foreach ( $form->fields() as $field ) {
			$labels[ (string) ( $field['id'] ?? '' ) ] = (string) ( $field['label'] ?? '' );
		}
		$problems = [];
		foreach ( $result['errors'] as $field_id => $message ) {
			$problems[] = ( $labels[ $field_id ] ?? $field_id ) . ': ' . $message;
		}
		$steps[] = self::step( 'fields', [] === $problems ? 'pass' : 'fail', [] === $problems ? __( 'Every answer is valid.', 'flexa-formflow' ) : implode( ' · ', $problems ) );
		if ( [] !== $problems ) {
			return $steps;
		}

		$notifications = $form->notifications();
		$emails        = ( ! empty( $notifications['admin']['enabled'] ) ? 1 : 0 ) + ( ! empty( $notifications['confirmation']['enabled'] ) ? 1 : 0 );
		$workflows     = 0;
		foreach ( WorkflowRepository::instance()->active() as $workflow ) {
			$trigger = $workflow->trigger();
			if ( 0 === $trigger['form_id'] || $trigger['form_id'] === $form->id ) {
				++$workflows;
			}
		}

		$steps[] = self::step( 'entry', 'skip', __( 'Test run: no entry was saved.', 'flexa-formflow' ) );
		/* translators: %d: number of notification emails. */
		$steps[] = self::step( 'emails', 'skip', sprintf( _n( 'Test run: %d notification email would be sent; none was.', 'Test run: %d notification emails would be sent; none were.', $emails, 'flexa-formflow' ), $emails ) );
		/* translators: %d: number of workflows. */
		$steps[] = self::step( 'workflows', 'skip', sprintf( _n( 'Test run: %d active workflow would run; none did.', 'Test run: %d active workflows would run; none did.', $workflows, 'flexa-formflow' ), $workflows ) );

		return $steps;
	}

	/**
	 * @return array{step: string, status: string, detail: string}
	 */
	private static function step( string $step, string $status, string $detail ): array {
		return [
			'step'   => $step,
			'status' => $status,
			'detail' => $detail,
		];
	}
}
