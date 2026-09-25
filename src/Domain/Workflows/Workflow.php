<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Domain\Workflows;

defined( 'ABSPATH' ) || exit;

/**
 * A workflow: a trigger plus an ordered list of actions. The trigger and
 * actions live inside the JSON `config` document, mirroring how forms store
 * their fields. Only `active` workflows run when their trigger fires.
 */
final class Workflow {
	public function __construct(
		public readonly int $id,
		public readonly string $title,
		public readonly string $status,
		/** @var array<string, mixed> */
		public readonly array $config,
		public readonly string $created_at,
		public readonly string $updated_at,
	) {}

	/**
	 * @param array<string, mixed> $row
	 */
	public static function from_row( array $row ): self {
		$config = json_decode( (string) ( $row['config'] ?? '' ), true );

		return new self(
			id: (int) ( $row['id'] ?? 0 ),
			title: (string) ( $row['title'] ?? '' ),
			status: (string) ( $row['status'] ?? 'inactive' ),
			config: is_array( $config ) ? $config : [],
			created_at: (string) ( $row['created_at'] ?? '' ),
			updated_at: (string) ( $row['updated_at'] ?? '' ),
		);
	}

	public function is_active(): bool {
		return 'active' === $this->status;
	}

	/**
	 * @return array{type: string, form_id: int}
	 */
	public function trigger(): array {
		$trigger = is_array( $this->config['trigger'] ?? null ) ? $this->config['trigger'] : [];

		return [
			'type'    => (string) ( $trigger['type'] ?? 'form_submitted' ),
			'form_id' => (int) ( $trigger['form_id'] ?? 0 ),
		];
	}

	/**
	 * @return list<array{id: string, type: string, config: array<string, mixed>}>
	 */
	public function actions(): array {
		$actions = is_array( $this->config['actions'] ?? null ) ? $this->config['actions'] : [];
		$clean   = [];
		foreach ( $actions as $action ) {
			if ( ! is_array( $action ) || ! isset( $action['type'] ) || ! is_string( $action['type'] ) ) {
				continue;
			}
			$clean[] = [
				'id'     => (string) ( $action['id'] ?? '' ),
				'type'   => $action['type'],
				'config' => is_array( $action['config'] ?? null ) ? $action['config'] : [],
			];
		}

		return $clean;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'id'         => $this->id,
			'title'      => $this->title,
			'status'     => $this->status,
			'trigger'    => $this->trigger(),
			'actions'    => $this->actions(),
			'created_at' => $this->created_at,
			'updated_at' => $this->updated_at,
		];
	}
}
