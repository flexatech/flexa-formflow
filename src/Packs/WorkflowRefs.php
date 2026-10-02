<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a pack workflow's symbolic references into real ids. A manifest names
 * its trigger form and its email templates by `ref` because the ids do not
 * exist until the pack lands on a site. The importer and the restorer both
 * resolve through here, so a restored workflow is wired exactly like an
 * imported one.
 */
final class WorkflowRefs {
	/**
	 * Unknown refs resolve to 0 (any form / default template), never a foreign id.
	 *
	 * @param array<string, mixed> $payload
	 * @param array<string, int>   $form_ids
	 * @param array<string, int>   $email_ids
	 * @return array<string, mixed>
	 */
	public static function resolve( array $payload, array $form_ids, array $email_ids ): array {
		$trigger  = is_array( $payload['trigger'] ?? null ) ? $payload['trigger'] : [];
		$form_ref = (string) ( $trigger['form_ref'] ?? '' );
		unset( $trigger['form_ref'] );
		$trigger['form_id'] = $form_ids[ $form_ref ] ?? 0;

		$out = [
			'trigger' => $trigger,
			'actions' => self::actions( $payload['actions'] ?? null, $email_ids ),
		];
		// A recipe with a condition carries it, and its Otherwise branch, over.
		if ( is_array( $payload['condition'] ?? null ) ) {
			$out['condition']    = $payload['condition'];
			$out['else_actions'] = self::actions( $payload['else_actions'] ?? null, $email_ids );
		}

		return $out;
	}

	/**
	 * One branch's actions with `template_ref` resolved to the installed id.
	 *
	 * @param mixed              $raw
	 * @param array<string, int> $email_ids
	 * @return list<array<string, mixed>>
	 */
	private static function actions( $raw, array $email_ids ): array {
		$actions = [];
		foreach ( is_array( $raw ) ? $raw : [] as $action ) {
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

		return $actions;
	}
}
