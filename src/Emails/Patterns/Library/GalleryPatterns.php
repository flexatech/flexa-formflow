<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails\Patterns\Library;

use Flexa\FormFlow\Emails\Patterns\Blocks as B;
use Flexa\FormFlow\Emails\Patterns\Registry;

defined( 'ABSPATH' ) || exit;

/**
 * Picture grids built from the columns and image blocks. Columns stack on
 * mobile, so every gallery stays readable on a phone.
 */
final class GalleryPatterns {
	/**
	 * @return list<array<string, mixed>>
	 */
	public static function all(): array {
		$tile = static fn( string $label ): array => [
			B::image( $label ),
			B::text( '<strong>' . $label . '</strong>', 'center', 13 ),
		];

		return [
			Registry::define(
				'gallery-three',
				'gallery',
				__( 'Three-picture row', 'flexa-formflow' ),
				__( 'Three images with short captions.', 'flexa-formflow' ),
				[ 'grid', 'three', 'images', 'captions' ],
				[
					B::columns(
						[
							$tile( __( 'First pick', 'flexa-formflow' ) ),
							$tile( __( 'Second pick', 'flexa-formflow' ) ),
							$tile( __( 'Third pick', 'flexa-formflow' ) ),
						],
						[ 'gap' => 12 ]
					),
				]
			),
			Registry::define(
				'gallery-feature-detail',
				'gallery',
				__( 'Feature and details', 'flexa-formflow' ),
				__( 'One large picture over two detail shots.', 'flexa-formflow' ),
				[ 'feature', 'detail', 'large', 'mosaic' ],
				[
					B::image( __( 'Main picture', 'flexa-formflow' ) ),
					B::columns(
						[
							[ B::image( __( 'Detail', 'flexa-formflow' ) ) ],
							[ B::image( __( 'Detail', 'flexa-formflow' ) ) ],
						],
						[ 'gap' => 12 ]
					),
				]
			),
			Registry::define(
				'gallery-two-cards',
				'gallery',
				__( 'Two picture cards', 'flexa-formflow' ),
				__( 'Two pictures, each with a title and a line of text.', 'flexa-formflow' ),
				[ 'cards', 'two', 'compare', 'side by side' ],
				[
					B::columns(
						[
							[
								B::image( __( 'Picture', 'flexa-formflow' ) ),
								B::heading( __( 'For work', 'flexa-formflow' ), 16 ),
								B::text( __( 'A short description.', 'flexa-formflow' ), 'left', 13 ),
							],
							[
								B::image( __( 'Picture', 'flexa-formflow' ) ),
								B::heading( __( 'For the weekend', 'flexa-formflow' ), 16 ),
								B::text( __( 'A short description.', 'flexa-formflow' ), 'left', 13 ),
							],
						]
					),
				]
			),
			Registry::define(
				'gallery-categories',
				'gallery',
				__( 'Browse by topic', 'flexa-formflow' ),
				__( 'A title and three linked picture tiles.', 'flexa-formflow' ),
				[ 'categories', 'topics', 'browse', 'links' ],
				[
					B::heading( __( 'Explore by topic', 'flexa-formflow' ), 20, 'center' ),
					B::columns(
						[
							[ B::image( __( 'Topic', 'flexa-formflow' ), 0, 'center', [ 'link' => '{site_url}' ] ), B::text( '<a href="{site_url}">' . __( 'Guides', 'flexa-formflow' ) . '</a>', 'center', 13 ) ],
							[ B::image( __( 'Topic', 'flexa-formflow' ), 0, 'center', [ 'link' => '{site_url}' ] ), B::text( '<a href="{site_url}">' . __( 'Stories', 'flexa-formflow' ) . '</a>', 'center', 13 ) ],
							[ B::image( __( 'Topic', 'flexa-formflow' ), 0, 'center', [ 'link' => '{site_url}' ] ), B::text( '<a href="{site_url}">' . __( 'News', 'flexa-formflow' ) . '</a>', 'center', 13 ) ],
						],
						[ 'gap' => 12 ]
					),
				]
			),
			Registry::define(
				'gallery-mosaic',
				'gallery',
				__( 'Editorial mosaic', 'flexa-formflow' ),
				__( 'One tall picture beside two stacked ones.', 'flexa-formflow' ),
				[ 'mosaic', 'editorial', 'asymmetric', 'stack' ],
				[
					B::columns(
						[
							[ B::image( __( 'Tall picture', 'flexa-formflow' ) ) ],
							[ B::image( __( 'Picture', 'flexa-formflow' ) ), B::image( __( 'Picture', 'flexa-formflow' ) ) ],
						],
						[
							'gap'    => 12,
							'valign' => [ 'middle', 'top' ],
						]
					),
				]
			),
			Registry::define(
				'gallery-caption',
				'gallery',
				__( 'Picture with caption', 'flexa-formflow' ),
				__( 'A single picture and a small muted caption.', 'flexa-formflow' ),
				[ 'single', 'caption', 'photo', 'simple' ],
				[
					B::image( __( 'Picture', 'flexa-formflow' ) ),
					B::text( __( 'A short caption that explains the picture.', 'flexa-formflow' ), 'center', 12, [ 'color' => B::MUTED ] ),
				]
			),
		];
	}
}
