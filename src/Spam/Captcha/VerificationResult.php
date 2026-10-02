<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

defined( 'ABSPATH' ) || exit;

/**
 * The normalized outcome of one CAPTCHA check, whatever the provider. The
 * submit pipeline only ever reads this, so adding a provider never touches it.
 * `code` is a stable machine id for logs and the frontend; `message` is safe to
 * show a visitor and never names the provider's internals.
 */
final class VerificationResult {
	public const OK              = 'ok';
	public const MISSING         = 'missing';
	public const INVALID         = 'invalid';
	public const EXPIRED         = 'expired';
	public const REPLAYED        = 'replayed';
	public const MISMATCH        = 'mismatch';
	public const UNAVAILABLE     = 'unavailable';
	public const NOT_CONFIGURED  = 'not_configured';
	public const INVALID_SECRET  = 'invalid_secret';

	private function __construct(
		public readonly bool $ok,
		public readonly string $code,
		public readonly string $message,
	) {}

	public static function success(): self {
		return new self( true, self::OK, '' );
	}

	public static function failure( string $code ): self {
		return new self( false, $code, self::message_for( $code ) );
	}

	/**
	 * Whether the visitor can fix this by verifying again (as opposed to a site
	 * problem only an admin can fix).
	 */
	public function retryable(): bool {
		return self::NOT_CONFIGURED !== $this->code && self::INVALID_SECRET !== $this->code;
	}

	private static function message_for( string $code ): string {
		switch ( $code ) {
			case self::MISSING:
				return __( 'Please complete the verification before sending.', 'flexa-formflow' );
			case self::EXPIRED:
			case self::REPLAYED:
				return __( 'The verification expired. Please verify again and resend.', 'flexa-formflow' );
			case self::UNAVAILABLE:
				return __( 'We could not check the verification right now. Please try again in a moment.', 'flexa-formflow' );
			case self::NOT_CONFIGURED:
			case self::INVALID_SECRET:
				return __( 'This form cannot accept submissions right now. Please try again later.', 'flexa-formflow' );
			default:
				return __( 'Verification failed. Please verify again and resend.', 'flexa-formflow' );
		}
	}
}
