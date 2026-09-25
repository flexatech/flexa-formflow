<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Workflows;

defined( 'ABSPATH' ) || exit;

/**
 * Normalizes the workflow config document (trigger + actions) on the way into
 * storage: unknown action types are dropped and every action config is coerced
 * to its known shape, so a malformed payload can never reach the engine.
 */
final class WorkflowSanitizer {
	private const ACTION_TYPES = [ 'send_email', 'webhook', 'set_status', 'add_note' ];

	/**
	 * @param array<string, mixed> $config
	 * @return array{trigger: array{type: string, form_id: int}, actions: list<array{id: string, type: string, config: array<string, mixed>}>}
	 */
	public static function sanitize( array $config ): array {
		$trigger_in = is_array( $config['trigger'] ?? null ) ? $config['trigger'] : [];
		$trigger    = [
			'type'    => 'form_submitted',
			'form_id' => max( 0, (int) ( $trigger_in['form_id'] ?? 0 ) ),
		];

		$actions_in = is_array( $config['actions'] ?? null ) ? $config['actions'] : [];
		$actions    = [];
		$index      = 0;
		foreach ( $actions_in as $action ) {
			if ( ! is_array( $action ) ) {
				continue;
			}
			$type = (string) ( $action['type'] ?? '' );
			if ( ! in_array( $type, self::ACTION_TYPES, true ) ) {
				continue;
			}
			++$index;
			$actions[] = [
				'id'     => self::action_id( $action, $index ),
				'type'   => $type,
				'config' => self::action_config( $type, is_array( $action['config'] ?? null ) ? $action['config'] : [] ),
			];
		}

		return [
			'trigger' => $trigger,
			'actions' => $actions,
		];
	}

	/**
	 * @param array<string, mixed> $action
	 */
	private static function action_id( array $action, int $index ): string {
		$id = sanitize_key( (string) ( $action['id'] ?? '' ) );

		return '' !== $id ? $id : 'a' . $index;
	}

	/**
	 * @param array<string, mixed> $config
	 * @return array<string, mixed>
	 */
	private static function action_config( string $type, array $config ): array {
		switch ( $type ) {
			case 'send_email':
				$to_mode = in_array( $config['to_mode'] ?? '', [ 'admin', 'field', 'fixed' ], true )
					? (string) $config['to_mode']
					: 'admin';
				return [
					'to_mode'     => $to_mode,
					'to'          => sanitize_text_field( (string) ( $config['to'] ?? '' ) ),
					'subject'     => sanitize_text_field( (string) ( $config['subject'] ?? '' ) ),
					'template_id' => max( 0, (int) ( $config['template_id'] ?? 0 ) ),
					'message'     => wp_kses_post( (string) ( $config['message'] ?? '' ) ),
				];
			case 'webhook':
				return [
					'url' => esc_url_raw( (string) ( $config['url'] ?? '' ) ),
				];
			case 'set_status':
				return [
					'status' => in_array( $config['status'] ?? '', [ 'read', 'unread' ], true )
						? (string) $config['status']
						: 'read',
				];
			case 'add_note':
				return [
					'note' => sanitize_textarea_field( (string) ( $config['note'] ?? '' ) ),
				];
			default:
				return [];
		}
	}
}
