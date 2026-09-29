<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Packs;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\EmailTemplates\EmailTemplateRepository;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Packs\PackManifest;
use Flexa\FormFlow\Domain\Workflows\WorkflowRepository;

defined( 'ABSPATH' ) || exit;

/**
 * Removes exactly what a pack's install (or a later restore) is recorded to
 * have created, then clears the install stamp so the catalog offers
 * "Install pack" again instead of showing a permanently stuck "Installed"
 * badge over content that no longer fully exists.
 *
 * Only the ids {@see InstallState} recorded are touched - never a name match
 * or "anything that looks related" - so an uninstall can never reach past
 * what this exact install created. A row already missing (the same situation
 * {@see Restorer} exists to fix) is simply skipped, not an error.
 *
 * Patterns are left alone on purpose: they are shared by content id across
 * every pack that ships them, they already live as ordinary My Library
 * assets once installed, and Installer/Restorer both treat them as the
 * user's own copies. Removing them here would either delete a pattern
 * another installed pack still depends on, or take back something the user
 * has since edited and now relies on - the existing "Remove" action on a
 * My Library card is the right place to drop a pattern deliberately.
 */
final class Uninstaller {
	use HasInstance;

	/**
	 * @return array{pack: string, deleted: array{forms: int, emails: int, workflows: int}}
	 */
	public function uninstall( PackManifest $manifest ): array {
		$ids     = InstallState::items_of( $manifest->id );
		$deleted = [
			'forms'     => 0,
			'emails'    => 0,
			'workflows' => 0,
		];

		foreach ( $ids['forms'] ?? [] as $id ) {
			if ( null !== FormRepository::instance()->find( $id ) ) {
				FormRepository::instance()->delete( $id );
				++$deleted['forms'];
			}
		}

		foreach ( $ids['emails'] ?? [] as $id ) {
			if ( null !== EmailTemplateRepository::instance()->find( $id ) ) {
				EmailTemplateRepository::instance()->delete( $id );
				++$deleted['emails'];
			}
		}

		foreach ( $ids['workflows'] ?? [] as $id ) {
			if ( null !== WorkflowRepository::instance()->find( $id ) ) {
				WorkflowRepository::instance()->delete( $id );
				++$deleted['workflows'];
			}
		}

		InstallState::forget( $manifest->id );

		return [
			'pack'    => $manifest->id,
			'deleted' => $deleted,
		];
	}
}
