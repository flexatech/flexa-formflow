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
 */
final class RenderContext {
	public function __construct(
		public readonly ?Form $form = null,
		public readonly ?Entry $entry = null,
		/** @var 'admin'|'confirmation' */
		public readonly string $type = 'admin',
		public readonly bool $is_preview = false,
	) {}
}
