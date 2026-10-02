<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Workflows;

use Flexa\FormFlow\Domain\Entries\Entry;
use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\FieldTypes;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Domain\Forms\FormRepository;
use Flexa\FormFlow\Domain\Workflows\Workflow;
use WP_Error;

defined( 'ABSPATH' ) || exit;

/**
 * What a test run runs against. The builder's test dialog picks one of:
 *
 * - `latest`: the trigger form's newest entry (the old behavior);
 * - `entry`:  a chosen saved entry;
 * - `values`: values typed into the dialog, built into an entry that is never
 *             saved (id 0). Actions that write to an entry only report what
 *             they would do for it (see Engine).
 *
 * Saved entries are real, so actions on them (status, note) really apply, as
 * they always have; email and webhook steps really send either way.
 */
final class TestRun {
	/**
	 * @param array<string, mixed> $params The request's JSON body.
	 * @return array{form: Form, entry: Entry}|WP_Error|null Null when there is nothing to test against.
	 */
	public static function subject( Workflow $workflow, array $params ): array|WP_Error|null {
		$trigger_form = $workflow->trigger()['form_id'];
		$source       = (string) ( $params['source'] ?? 'latest' );

		if ( 'values' === $source ) {
			// "Any form" workflows test against whichever form the dialog picked.
			$form_id = $trigger_form > 0 ? $trigger_form : absint( $params['form_id'] ?? 0 );
			$form    = $form_id > 0 ? FormRepository::instance()->find( $form_id ) : null;
			if ( null === $form ) {
				return self::invalid( __( 'Choose the form whose fields the test values are for.', 'flexa-formflow' ) );
			}

			return [
				'form'  => $form,
				'entry' => self::entry_from_values( $form, is_array( $params['values'] ?? null ) ? $params['values'] : [] ),
			];
		}

		if ( 'entry' === $source ) {
			$entry = EntryRepository::instance()->find( absint( $params['entry_id'] ?? 0 ) );
			if ( null === $entry || ( $trigger_form > 0 && $entry->form_id !== $trigger_form ) ) {
				return self::invalid( __( 'That entry was not found for this workflow\'s form.', 'flexa-formflow' ) );
			}
		} else {
			$latest = EntryRepository::instance()->all(
				array_merge( [ 'per_page' => 1 ], $trigger_form > 0 ? [ 'form_id' => $trigger_form ] : [] )
			);
			$entry  = $latest['items'][0] ?? null;
			if ( null === $entry ) {
				return null;
			}
		}

		$form = FormRepository::instance()->find( $entry->form_id );

		return null === $form ? self::invalid( __( 'The entry\'s form no longer exists.', 'flexa-formflow' ) ) : [
			'form'  => $form,
			'entry' => $entry,
		];
	}

	/**
	 * An unsaved entry from typed values, cleaned exactly as a real submission
	 * is. Required fields may be left blank: a test is allowed to be partial.
	 *
	 * @param array<mixed> $values
	 */
	private static function entry_from_values( Form $form, array $values ): Entry {
		$data = [];
		foreach ( $form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id ) {
				continue;
			}
			$error             = null;
			$data[ $field_id ] = FieldTypes::sanitize_value( $field, $values[ $field_id ] ?? '', $error );
		}

		return new Entry(
			id: 0,
			form_id: $form->id,
			status: 'unread',
			data: $data,
			meta: [ 'test' => true ],
			created_at: current_time( 'mysql', true ),
		);
	}

	private static function invalid( string $message ): WP_Error {
		return new WP_Error( 'flexa_formflow_invalid_test', $message, [ 'status' => 400 ] );
	}
}
