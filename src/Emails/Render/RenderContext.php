<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Render;

use Flexa\FormFlow\Domain\Entries\Entry;
use Flexa\FormFlow\Domain\Forms\Form;

defined( 'ABSPATH' ) || exit;

/**
 * Everything an element needs to render: the form and entry behind the email
 * (either may be null), whether this is the admin or confirmation email, and
 * whether it is an editor preview (preview falls back to sample data instead
 * of rendering blanks).
 *
 * The WooCommerce takeover reuses the same context: it leaves form/entry null,
 * sets $type to the WooCommerce email id, and passes the live $order/$email so
 * order tokens and conditions can resolve. $extras carries stray template args
 * (customer note, reset key) that only some WooCommerce emails provide.
 */
final class RenderContext {
	/**
	 * @param array<string, mixed> $extras
	 */
	public function __construct(
		public readonly ?Form $form = null,
		public readonly ?Entry $entry = null,
		/** @var 'admin'|'confirmation'|string */
		public readonly string $type = 'admin',
		public readonly bool $is_preview = false,
		public readonly ?\WC_Order $order = null,
		public readonly ?\WC_Email $email = null,
		public readonly array $extras = [],
		/** The editor canvas: adds selection markup and keeps blocks the global layout replaces. */
		public readonly bool $editor = false,
		/**
		 * Rendering a block inside a Columns cell. The Columns wrapper already
		 * holds the email's side padding, so blocks there add none of their own.
		 */
		public readonly bool $inside_column = false,
	) {}

	/**
	 * The same context for a block inside a Columns cell. A new object: the
	 * caller's context (and every block rendered after the Columns) is unchanged.
	 */
	public function for_column(): self {
		if ( $this->inside_column ) {
			return $this;
		}

		return new self(
			form: $this->form,
			entry: $this->entry,
			type: $this->type,
			is_preview: $this->is_preview,
			order: $this->order,
			email: $this->email,
			extras: $this->extras,
			editor: $this->editor,
			inside_column: true,
		);
	}

	public function extra( string $key ): mixed {
		return $this->extras[ $key ] ?? null;
	}
}
