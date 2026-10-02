<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Api;

use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Spam\ClientFingerprint;
use Flexa\FormFlow\Spam\GuardResult;
use Flexa\FormFlow\Spam\SubmissionGuard;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

defined( 'ABSPATH' ) || exit;

/**
 * The one public route. A submission moves through a fixed pipeline and no
 * step with a side effect (entry, notification, workflow, webhook) runs until
 * every check before it has passed:
 *
 *   request size → published form → built-in protection (honeypot, timing)
 *   → rate limit → CAPTCHA (server-side) → field validation → entry
 *   → `flexa_formflow.entry.created` (notifications, workflows) → success.
 *
 * The route is public on purpose (logged-out visitors), so there is no nonce:
 * a REST nonce is per-user and would break cached pages. The spam layers stand
 * in for it. A bot caught by the built-in layer gets the normal success answer
 * and nothing is stored, sent or run.
 */
final class SubmitEndpoint extends Endpoint {
	/** Bytes. Far above any real form, far below a payload worth attacking with. */
	private const MAX_BODY = 131072;

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/submit/(?P<uuid>[a-f0-9-]{36})',
			[
				[
					'methods'             => 'POST',
					'callback'            => [ $this, 'submit' ],
					// Intentionally public: logged-out visitors submit forms here. The
					// route only creates an entry for a published form, reads nothing
					// back, and sanitizes every value against the form's field schema.
					// All admin routes use a capability check instead.
					'permission_callback' => '__return_true',
					'args'                => [
						'uuid' => [ 'sanitize_callback' => 'sanitize_text_field' ],
					],
				],
			]
		);
	}

	public function submit( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		if ( strlen( (string) $request->get_body() ) > self::MAX_BODY ) {
			return new WP_Error( 'flexa_formflow_too_large', __( 'This submission is too large.', 'flexa-formflow' ), [ 'status' => 413 ] );
		}

		$form = FormRepository::instance()->find_by_uuid( (string) $request->get_param( 'uuid' ) );
		if ( null === $form || ! $form->is_published() ) {
			return new WP_Error( 'flexa_formflow_not_found', __( 'This form is not available.', 'flexa-formflow' ), [ 'status' => 404 ] );
		}

		$params  = (array) $request->get_json_params();
		$success = self::success_message( $form );

		$guard = SubmissionGuard::make()->check( $form, $params, ClientFingerprint::ip(), ClientFingerprint::user_agent() );
		if ( GuardResult::SILENT === $guard->verdict ) {
			return new WP_REST_Response( [ 'message' => $success ], 200 );
		}
		if ( GuardResult::REJECT === $guard->verdict ) {
			return new WP_Error(
				'flexa_formflow_rate_limited' === $guard->code ? $guard->code : 'flexa_formflow_captcha',
				$guard->message,
				[
					'status'  => $guard->status,
					'captcha' => $guard->code,
					'retry'   => $guard->retryable,
				]
			);
		}

		$values = is_array( $params['fields'] ?? null ) ? $params['fields'] : [];
		$result = self::validate( $form, $values );
		if ( [] !== $result['errors'] ) {
			return new WP_Error(
				'flexa_formflow_validation',
				__( 'Please fix the highlighted fields.', 'flexa-formflow' ),
				[
					'status' => 400,
					'errors' => $result['errors'],
				]
			);
		}

		$entry_id = EntryRepository::instance()->create(
			$form->id,
			$result['data'],
			[
				'user_agent' => ClientFingerprint::user_agent(),
				'referer'    => esc_url_raw( (string) wp_get_referer() ),
			]
		);

		do_action( 'flexa_formflow.entry.created', $entry_id, $form );

		return new WP_REST_Response( [ 'message' => $success ], 200 );
	}

	public static function success_message( Form $form ): string {
		$success = (string) ( $form->settings()['success_message'] ?? '' );

		return '' !== $success ? $success : __( 'Thanks, we got your message.', 'flexa-formflow' );
	}

	/**
	 * Sanitize every value against its field and collect errors. Shared with
	 * the builder's test run so both judge a submission the same way.
	 *
	 * @param array<string, mixed> $values
	 * @return array{data: array<string, mixed>, errors: array<string, string>}
	 */
	public static function validate( Form $form, array $values ): array {
		$data   = [];
		$errors = [];
		foreach ( $form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}
			$error             = null;
			$data[ $field_id ] = FieldTypes::sanitize_value( $field, $values[ $field_id ] ?? '', $error );
			if ( null !== $error ) {
				$errors[ $field_id ] = $error;
			}
		}

		/**
		 * Extension seam: add or clear validation errors before the verdict.
		 *
		 * @param array<string, string>              $errors field_id => message
		 * @param array<string, mixed>               $data   sanitized values
		 * @param \Flexa\FormFlow\Domain\Forms\Form  $form
		 */
		$errors = (array) apply_filters( 'flexa_formflow.submission.validate', $errors, $data, $form );

		return [
			'data'   => $data,
			'errors' => $errors,
		];
	}
}
