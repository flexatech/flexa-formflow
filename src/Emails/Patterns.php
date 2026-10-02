<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Kept for callers written before the pattern library moved to
 * {@see Registry}: the same normalized, filterable list of email patterns.
 */
final class Patterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		return Registry::all();
	}
}
