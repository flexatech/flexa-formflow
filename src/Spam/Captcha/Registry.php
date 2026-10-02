<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Spam\Captcha;

defined( 'ABSPATH' ) || exit;

/**
 * The CAPTCHA providers a form can pick. A form stores only the provider id
 * (`none` for no CAPTCHA); keys stay in the settings.
 */
final class Registry {
	public const NONE = 'none';

	/** @var array<string, CaptchaProviderInterface>|null */
	private static ?array $providers = null;

	/**
	 * @return array<string, CaptchaProviderInterface>
	 */
	public static function providers(): array {
		if ( null !== self::$providers ) {
			return self::$providers;
		}

		$list = [ new TurnstileProvider(), new RecaptchaV2Provider() ];

		/**
		 * Add CAPTCHA providers. Each entry must implement CaptchaProviderInterface.
		 *
		 * @param list<CaptchaProviderInterface> $list
		 */
		$list = apply_filters( 'flexa_formflow.captcha.providers', $list );

		$providers = [];
		foreach ( is_array( $list ) ? $list : [] as $provider ) {
			if ( $provider instanceof CaptchaProviderInterface && self::NONE !== $provider->id() ) {
				$providers[ $provider->id() ] = $provider;
			}
		}

		self::$providers = $providers;

		return $providers;
	}

	/**
	 * Every id a form may store, `none` first.
	 *
	 * @return list<string>
	 */
	public static function ids(): array {
		return array_merge( [ self::NONE ], array_keys( self::providers() ) );
	}

	public static function get( string $id ): ?CaptchaProviderInterface {
		return self::providers()[ $id ] ?? null;
	}

	/** A stored value coerced to a known id. */
	public static function coerce( mixed $id ): string {
		return is_string( $id ) && in_array( $id, self::ids(), true ) ? $id : self::NONE;
	}

	/** `none`, or a provider whose keys are both saved. */
	public static function is_ready( string $id ): bool {
		if ( self::NONE === $id ) {
			return true;
		}
		$provider = self::get( $id );

		return null !== $provider && $provider->is_configured();
	}

	/** For tests: forget the cached list. */
	public static function reset(): void {
		self::$providers = null;
	}
}
