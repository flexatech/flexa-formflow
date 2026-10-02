<?php
/**
 * Stand-in for PHPUnit\Framework\TestCase, loaded by tests/run.php only when
 * PHPUnit itself is not installed.
 */

declare(strict_types=1);

namespace PHPUnit\Framework;

class AssertionFailedError extends \RuntimeException {}

abstract class TestCase {
	public function __construct( private string $name = '' ) {}

	protected function setUp(): void {}

	protected function tearDown(): void {}

	public function runBare(): void {
		$this->setUp();
		try {
			$this->{$this->name}();
		} finally {
			$this->tearDown();
		}
	}

	private static function fail_with( string $message, string $extra = '' ): never {
		throw new AssertionFailedError( '' !== $extra ? $extra . ': ' . $message : $message );
	}

	public static function assertTrue( mixed $value, string $message = '' ): void {
		true === $value || self::fail_with( 'expected true, got ' . var_export( $value, true ), $message );
	}

	public static function assertFalse( mixed $value, string $message = '' ): void {
		false === $value || self::fail_with( 'expected false, got ' . var_export( $value, true ), $message );
	}

	public static function assertSame( mixed $expected, mixed $actual, string $message = '' ): void {
		$expected === $actual || self::fail_with( 'expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ), $message );
	}

	public static function assertNotSame( mixed $expected, mixed $actual, string $message = '' ): void {
		$expected !== $actual || self::fail_with( 'values are identical: ' . var_export( $actual, true ), $message );
	}

	public static function assertNull( mixed $value, string $message = '' ): void {
		null === $value || self::fail_with( 'expected null, got ' . var_export( $value, true ), $message );
	}

	public static function assertNotNull( mixed $value, string $message = '' ): void {
		null !== $value || self::fail_with( 'expected a value, got null', $message );
	}

	/** @param array<mixed>|\Countable $haystack */
	public static function assertCount( int $count, array|\Countable $haystack, string $message = '' ): void {
		count( $haystack ) === $count || self::fail_with( 'expected ' . $count . ' items, got ' . count( $haystack ), $message );
	}

	/** @param array<mixed> $haystack */
	public static function assertContains( mixed $needle, array $haystack, string $message = '' ): void {
		in_array( $needle, $haystack, true ) || self::fail_with( var_export( $needle, true ) . ' not found', $message );
	}

	/** @param array<mixed> $haystack */
	public static function assertNotContains( mixed $needle, array $haystack, string $message = '' ): void {
		! in_array( $needle, $haystack, true ) || self::fail_with( var_export( $needle, true ) . ' should not be present', $message );
	}

	/** @param array<mixed> $array */
	public static function assertArrayHasKey( string|int $key, array $array, string $message = '' ): void {
		array_key_exists( $key, $array ) || self::fail_with( 'missing key ' . $key, $message );
	}

	public static function assertStringContainsString( string $needle, string $haystack, string $message = '' ): void {
		str_contains( $haystack, $needle ) || self::fail_with( '"' . $needle . '" not found in "' . mb_substr( $haystack, 0, 300 ) . '"', $message );
	}

	public static function assertStringNotContainsString( string $needle, string $haystack, string $message = '' ): void {
		! str_contains( $haystack, $needle ) || self::fail_with( '"' . $needle . '" should not be in "' . mb_substr( $haystack, 0, 300 ) . '"', $message );
	}

	public static function assertGreaterThanOrEqual( int|float $min, int|float $actual, string $message = '' ): void {
		$actual >= $min || self::fail_with( $actual . ' < ' . $min, $message );
	}

	public static function assertLessThanOrEqual( int|float $max, int|float $actual, string $message = '' ): void {
		$actual <= $max || self::fail_with( $actual . ' > ' . $max, $message );
	}
}
