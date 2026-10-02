<?php
/**
 * Minimal test runner for environments without PHPUnit (`php tests/run.php`).
 * It runs the same test classes `composer test` runs, using a small stand-in
 * for PHPUnit's TestCase that covers the assertions this suite uses.
 */

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if ( ! class_exists( \PHPUnit\Framework\TestCase::class ) ) {
	require __DIR__ . '/Support/TestCaseShim.php';
}

$files = glob( __DIR__ . '/Unit/*Test.php' ) ?: [];
$pass  = 0;
$fail  = [];

foreach ( $files as $file ) {
	require_once $file;
	$class = 'Flexa\\FormFlow\\Tests\\Unit\\' . basename( $file, '.php' );
	foreach ( get_class_methods( $class ) as $method ) {
		if ( ! str_starts_with( $method, 'test' ) ) {
			continue;
		}
		$test = new $class( $method );
		try {
			$test->runBare();
			++$pass;
			echo '.';
		} catch ( \Throwable $e ) {
			$fail[] = sprintf( "%s::%s\n  %s (%s:%d)", $class, $method, $e->getMessage(), basename( $e->getFile() ), $e->getLine() );
			echo 'F';
		}
	}
}

echo "\n\n";
foreach ( $fail as $message ) {
	echo $message, "\n\n";
}
printf( "%d passed, %d failed\n", $pass, count( $fail ) );
exit( [] === $fail ? 0 : 1 );
