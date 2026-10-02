<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

defined( 'ABSPATH' ) || exit;

/**
 * What a CAPTCHA token must match to count for this submission: the form
 * instance it was issued for (Turnstile `cdata`), the widget action, and the
 * site's hostname. The visitor IP is passed on to the provider only; it is
 * never stored.
 */
final class SubmissionContext {
	public const ACTION = 'flexa_formflow_submit';

	/**
	 * @param list<string> $hostnames
	 */
	public function __construct(
		public readonly string $form_uuid,
		public readonly string $remote_ip,
		public readonly array $hostnames,
		public readonly string $action = self::ACTION,
	) {}

	/**
	 * The hostnames a token may come from: the site's own, plus any a filter
	 * adds (a headless frontend, a provider's test-key hostname).
	 *
	 * @return list<string>
	 */
	public static function site_hostnames(): array {
		$hosts = array_filter(
			[
				(string) wp_parse_url( home_url(), PHP_URL_HOST ),
				(string) wp_parse_url( site_url(), PHP_URL_HOST ),
			]
		);

		/**
		 * Hostnames a CAPTCHA token may be issued for.
		 *
		 * @param list<string> $hosts
		 */
		$hosts = apply_filters( 'flexa_formflow.captcha.hostnames', array_values( array_unique( $hosts ) ) );

		return array_values( array_map( 'strtolower', array_filter( (array) $hosts, 'is_string' ) ) );
	}

	/**
	 * Turnstile's cdata only allows [A-Za-z0-9_-]; a form uuid already fits.
	 */
	public function cdata(): string {
		return (string) preg_replace( '/[^A-Za-z0-9_-]/', '', $this->form_uuid );
	}
}
