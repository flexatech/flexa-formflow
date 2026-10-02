<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * What the spam layers decided for one submission:
 *
 * - `pass`: carry on to field validation and the entry;
 * - `silent`: a bot; answer with the normal success message but do nothing;
 * - `reject`: a person who can fix it (verify again, wait), or a site problem.
 *
 * `steps` is the per-layer trace the builder's test run shows.
 *
 * @phpstan-type Step array{step: string, status: string, detail: string}
 */
final class GuardResult {
	public const PASS   = 'pass';
	public const SILENT = 'silent';
	public const REJECT = 'reject';

	/**
	 * @param list<Step> $steps
	 */
	public function __construct(
		public readonly string $verdict,
		public readonly array $steps,
		public readonly string $code = '',
		public readonly string $message = '',
		public readonly int $status = 200,
		public readonly bool $retryable = true,
	) {}
}
