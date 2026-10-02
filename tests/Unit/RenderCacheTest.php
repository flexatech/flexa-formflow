<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Tests\Unit;

use Flexa\FormFlow\Support\RenderCache;
use PHPUnit\Framework\TestCase;

final class RenderCacheTest extends TestCase {
	protected function setUp(): void {
		\WP_Test_State::reset();
		RenderCache::instance()->register();
	}

	public function test_builds_once_per_key(): void {
		$calls = 0;
		$build = static function () use ( &$calls ): string {
			++$calls;
			return 'html';
		};
		$this->assertSame( 'html', RenderCache::remember( 'pattern', [ 'a' ], $build, 60 ) );
		$this->assertSame( 'html', RenderCache::remember( 'pattern', [ 'a' ], $build, 60 ) );
		$this->assertSame( 1, $calls );
		RenderCache::remember( 'pattern', [ 'b' ], $build, 60 );
		$this->assertSame( 2, $calls, 'a different input is a different entry' );
	}

	public function test_new_entry_form_save_or_settings_save_invalidate(): void {
		foreach ( [ 'flexa_formflow.entry.created', 'flexa_formflow.form.saved', 'flexa_formflow.settings.updated' ] as $hook ) {
			$calls = 0;
			$build = static function () use ( &$calls ): int {
				return ++$calls;
			};
			RenderCache::remember( 'dynamic-data', [ $hook ], $build, 60 );
			do_action( $hook, 7 );
			RenderCache::remember( 'dynamic-data', [ $hook ], $build, 60 );
			$this->assertSame( 2, $calls, $hook );
		}
	}
}
