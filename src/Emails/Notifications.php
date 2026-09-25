<?php

declare(strict_types=1);

namespace Flexa\FormFlow\Emails;

use Flexa\FormFlow\Concerns\HasInstance;
use Flexa\FormFlow\Domain\Entries\EntryRepository;
use Flexa\FormFlow\Domain\Forms\Form;
use Flexa\FormFlow\Support\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * The M1 email slice: fixed-template notification + confirmation on every
 * new entry, sent through wp_mail() so whatever SMTP/bridge plugin is active
 * (flexa-mailbridge included) handles delivery. The visual email builder
 * replaces the template in Phase 3; the hooks stay.
 */
final class Notifications {
	use HasInstance;

	public function register(): void {
		add_action( 'flexa_formflow.entry.created', [ $this, 'dispatch' ], 10, 2 );
	}

	public function dispatch( int $entry_id, Form $form ): void {
		$entry = EntryRepository::instance()->find( $entry_id );
		if ( null === $entry ) {
			return;
		}

		$notifications = $form->notifications();
		$admin         = is_array( $notifications['admin'] ?? null ) ? $notifications['admin'] : [];
		$confirmation  = is_array( $notifications['confirmation'] ?? null ) ? $notifications['confirmation'] : [];

		if ( ! empty( $admin['enabled'] ) ) {
			$this->send_admin_notification( $form, $entry->data, $admin, $entry_id );
		}

		if ( ! empty( $confirmation['enabled'] ) ) {
			$this->send_confirmation( $form, $entry->data, $confirmation, $entry_id );
		}
	}

	/**
	 * @param array<string, mixed> $data
	 * @param array<string, mixed> $config
	 */
	private function send_admin_notification( Form $form, array $data, array $config, int $entry_id ): void {
		$to = sanitize_email( (string) ( $config['to'] ?? '' ) );
		if ( '' === $to ) {
			$to = (string) get_option( 'admin_email' );
		}

		$subject = (string) ( $config['subject'] ?? '' );
		if ( '' === $subject ) {
			/* translators: 1: site name, 2: form title. */
			$subject = sprintf( __( '[%1$s] New submission: %2$s', 'flexa-formflow' ), get_bloginfo( 'name' ), $form->title );
		}

		$intro = '<p style="margin:0 0 16px;">' . sprintf(
			/* translators: %s: form title. */
			esc_html__( 'You received a new submission through "%s".', 'flexa-formflow' ),
			esc_html( $form->title )
		) . '</p>';

		$body = $this->wrap( $form->title, $intro . $this->fields_table( $form, $data ) );

		$this->send( $to, $subject, $body, 'admin', $entry_id );
	}

	/**
	 * @param array<string, mixed> $data
	 * @param array<string, mixed> $config
	 */
	private function send_confirmation( Form $form, array $data, array $config, int $entry_id ): void {
		$email_field = (string) ( $config['email_field'] ?? '' );
		$to          = sanitize_email( (string) ( $data[ $email_field ] ?? '' ) );
		if ( '' === $email_field || ! is_email( $to ) ) {
			return;
		}

		$subject = (string) ( $config['subject'] ?? '' );
		if ( '' === $subject ) {
			/* translators: %s: site name. */
			$subject = sprintf( __( 'We received your message, %s', 'flexa-formflow' ), get_bloginfo( 'name' ) );
		}

		$message = (string) ( $config['message'] ?? '' );
		if ( '' === $message ) {
			$message = __( 'Thanks for reaching out. We will get back to you soon.', 'flexa-formflow' );
		}

		$paragraphs = '';
		foreach ( preg_split( '/\n+/', $message ) ?: [] as $line ) {
			$line = trim( $line );
			if ( '' !== $line ) {
				$paragraphs .= '<p style="margin:0 0 16px;">' . esc_html( $line ) . '</p>';
			}
		}

		$body = $this->wrap( (string) get_bloginfo( 'name' ), $paragraphs );

		$this->send( $to, $subject, $body, 'confirmation', $entry_id );
	}

	/**
	 * @param array<string, mixed> $data
	 */
	private function fields_table( Form $form, array $data ): string {
		$rows = '';
		foreach ( $form->fields() as $field ) {
			$field_id = (string) ( $field['id'] ?? '' );
			if ( '' === $field_id || ( 'hidden' === ( $field['type'] ?? '' ) && '' === (string) ( $data[ $field_id ] ?? '' ) ) ) {
				continue;
			}
			$value = $data[ $field_id ] ?? '';
			$value = is_array( $value ) ? implode( ', ', array_map( 'strval', $value ) ) : (string) $value;

			$rows .= '<tr>'
				. '<td style="padding:8px 12px;border-bottom:1px solid #eaecf0;color:#667085;white-space:nowrap;vertical-align:top;">' . esc_html( (string) ( $field['label'] ?? $field_id ) ) . '</td>'
				. '<td style="padding:8px 12px;border-bottom:1px solid #eaecf0;color:#101828;">' . nl2br( esc_html( $value ) ) . '</td>'
				. '</tr>';
		}

		return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecf0;border-radius:6px;border-collapse:separate;font-size:14px;">' . $rows . '</table>';
	}

	private function wrap( string $heading, string $content ): string {
		$settings = Settings::all();
		$brand    = (string) $settings['brand_color'];
		$width    = (int) $settings['container_width'];
		$font     = (string) $settings['font_family'];
		$footer   = str_replace(
			[ '{year}', '{site_title}' ],
			[ gmdate( 'Y' ), (string) get_bloginfo( 'name' ) ],
			(string) $settings['footer_text']
		);

		return '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:' . esc_attr( (string) $settings['background_color'] ) . ';">'
			. '<table role="presentation" width="' . esc_attr( (string) $width ) . '" cellpadding="0" cellspacing="0" align="center" style="max-width:' . esc_attr( (string) $width ) . 'px;width:100%;background:' . esc_attr( (string) $settings['content_background'] ) . ';border-radius:8px;overflow:hidden;font-family:' . esc_attr( $font ) . ';color:' . esc_attr( (string) $settings['text_color'] ) . ';">'
			. '<tr><td style="background:' . esc_attr( $brand ) . ';padding:16px 24px;color:#ffffff;font-size:16px;font-weight:600;">' . esc_html( $heading ) . '</td></tr>'
			. '<tr><td style="padding:24px;font-size:14px;line-height:1.6;">' . $content . '</td></tr>'
			. '<tr><td style="padding:16px 24px;color:#98a2b3;font-size:12px;border-top:1px solid #eaecf0;">' . esc_html( $footer ) . '</td></tr>'
			. '</table></body></html>';
	}

	private function send( string $to, string $subject, string $body, string $type, int $entry_id ): void {
		$sent = wp_mail( $to, $subject, $body, [ 'Content-Type: text/html; charset=UTF-8' ] );

		if ( $sent ) {
			do_action( 'flexa_formflow.notification.sent', $type, $entry_id );
			return;
		}

		// Never block the submission response over a mail failure.
		error_log( sprintf( 'Flexa FormFlow: %s notification for entry %d failed to send.', $type, $entry_id ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}
}
