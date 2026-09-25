<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Library\LibraryRepository;
use Flexa\FormFlow\Domain\Packs\PackContent;
use Flexa\FormFlow\Domain\Packs\PackManifest;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Materializes a pack into the real tables. Forms and emails are created first
 * so their new ids are known; the workflow's `form_ref` / `template_ref` are
 * then resolved to those ids before it is created. Workflows arrive inactive
 * (the repository forces it), so nothing runs until the user reviews and turns
 * it on. Shared patterns are deduped by content id and stamped with provenance.
 * Pro-only content is skipped on Free and reported back, never half-installed.
 */
final class Installer {
	use HasInstance;

	/**
	 * @return array{
	 *     pack: string,
	 *     created: array{forms: int, emails: int, workflows: int, patterns: int},
	 *     skipped: list<array{name: string, reason: string}>
	 * }
	 */
	public function import( PackManifest $manifest ): array {
		$created = [
			'forms'     => 0,
			'emails'    => 0,
			'workflows' => 0,
			'patterns'  => 0,
		];
		$skipped = [];

		/** @var array<string, int> $form_ids */
		$form_ids = [];
		/** @var array<string, int> $email_ids */
		$email_ids = [];

		foreach ( $manifest->forms as $content ) {
			if ( ! $this->guard( $content, $skipped ) ) {
				continue;
			}
			$form_ids[ $content->ref ] = FormRepository::instance()->create( $content->name, $content->payload );
			++$created['forms'];
		}

		foreach ( $manifest->emails as $content ) {
			if ( ! $this->guard( $content, $skipped ) ) {
				continue;
			}
			$email_ids[ $content->ref ] = EmailTemplateRepository::instance()->create( $content->name, $content->payload );
			++$created['emails'];
		}

		foreach ( $manifest->workflows as $content ) {
			if ( ! $this->guard( $content, $skipped ) ) {
				continue;
			}
			$config = $this->resolve_workflow( $content->payload, $form_ids, $email_ids );
			WorkflowRepository::instance()->create( $content->name, $config );
			++$created['workflows'];
		}

		foreach ( $manifest->patterns as $content ) {
			if ( ! $this->guard( $content, $skipped ) ) {
				continue;
			}
			// A shared pattern keeps its content id across packs: install it once.
			if ( null !== LibraryRepository::instance()->find_by_content_id( $content->ref ) ) {
				continue;
			}
			LibraryRepository::instance()->create(
				'pattern',
				$content->name,
				$content->kind,
				$content->payload,
				[
					'pack'      => $manifest->id,
					'contentId' => $content->ref,
					'version'   => $manifest->version,
				]
			);
			++$created['patterns'];
		}

		InstallState::mark( $manifest->id, $manifest->version );

		return [
			'pack'    => $manifest->id,
			'created' => $created,
			'skipped' => $skipped,
		];
	}

	/**
	 * Skip and record Pro-only content on Free; otherwise allow.
	 *
	 * @param list<array{name: string, reason: string}> $skipped
	 */
	private function guard( PackContent $content, array &$skipped ): bool {
		if ( Entitlement::content_available( $content ) ) {
			return true;
		}

		$skipped[] = [
			'name'   => $content->name,
			'reason' => __( 'Needs FormFlow Pro', 'flexa-formflow' ),
		];

		return false;
	}

	/**
	 * Replace the workflow's symbolic references with the new content ids. Unknown
	 * refs resolve to 0 (any form / default template), never a foreign id.
	 *
	 * @param array<string, mixed>   $payload
	 * @param array<string, int>     $form_ids
	 * @param array<string, int>     $email_ids
	 * @return array<string, mixed>
	 */
	private function resolve_workflow( array $payload, array $form_ids, array $email_ids ): array {
		$trigger  = is_array( $payload['trigger'] ?? null ) ? $payload['trigger'] : [];
		$form_ref = (string) ( $trigger['form_ref'] ?? '' );
		unset( $trigger['form_ref'] );
		$trigger['form_id'] = $form_ids[ $form_ref ] ?? 0;

		$actions_in = is_array( $payload['actions'] ?? null ) ? $payload['actions'] : [];
		$actions    = [];
		foreach ( $actions_in as $action ) {
			if ( ! is_array( $action ) ) {
				continue;
			}
			$config       = is_array( $action['config'] ?? null ) ? $action['config'] : [];
			$template_ref = (string) ( $config['template_ref'] ?? '' );
			if ( '' !== $template_ref ) {
				unset( $config['template_ref'] );
				$config['template_id'] = $email_ids[ $template_ref ] ?? 0;
			}
			$action['config'] = $config;
			$actions[]        = $action;
		}

		return [
			'trigger' => $trigger,
			'actions' => $actions,
		];
	}
}
