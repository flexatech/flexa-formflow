<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam;

defined( 'ABSPATH' ) || exit;

/**
 * A keyed hash of the visitor's IP and browser, used only as a rate-limit
 * bucket. The raw IP is never stored: the hash is salted with the site's own
 * secret, so it cannot be reversed or matched across sites. Mixing in the user
 * agent keeps people who share one IP (an office, a campus NAT) from tripping
 * each other's limits.
 */
final class ClientFingerprint {
	/**
	 * The client IP. Only REMOTE_ADDR is trusted; a site behind a proxy maps the
	 * real address with the `flexa_formflow.spam.client_ip` filter.
	 */
	public static function ip(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( (string) $_SERVER['REMOTE_ADDR'] ) ) : '';

		/**
		 * @param string $ip REMOTE_ADDR.
		 */
		$ip = (string) apply_filters( 'flexa_formflow.spam.client_ip', $ip );

		return false !== filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '';
	}

	public static function user_agent(): string {
		return isset( $_SERVER['HTTP_USER_AGENT'] ) ? sanitize_text_field( wp_unslash( (string) $_SERVER['HTTP_USER_AGENT'] ) ) : '';
	}

	public static function hash( string $ip, string $user_agent ): string {
		$salt = function_exists( 'wp_salt' ) ? wp_salt( 'nonce' ) : 'flexa-formflow';

		return hash_hmac( 'sha256', $ip . '|' . $user_agent, 'flexa-formflow-rl|' . $salt );
	}
}
