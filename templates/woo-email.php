<?php
/**
 * WooCommerce email body. WooCommerce includes this file (via a swapped
 * wc_get_template) with the email's arguments extracted into scope: $order,
 * $email, $sent_to_admin, $additional_content, $user_login, $user_display_name,
 * $reset_key, $set_password_url, and so on. We build a render context from
 * them and echo the block tree assigned to this email.
 *
 * @see \Flexa\FormFlow\WooCommerce\Interceptor::swap_template()
 */

declare(strict_types=1);

use Flexa\FormFlow\Emails\Render\RenderContext;
use Flexa\FormFlow\Emails\Render\Renderer;
use Flexa\FormFlow\WooCommerce\WooTemplates;

defined( 'ABSPATH' ) || exit;

// The $ff_* locals are scoped to this WooCommerce template include, not true
// globals; the plugin's short `ff` prefix sits below the sniff's threshold.
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound -- template-scoped locals; see note above.
$ff_email = ( isset( $email ) && $email instanceof \WC_Email ) ? $email : null;
$ff_id    = null !== $ff_email ? (string) $ff_email->id : '';
$ff_order = ( isset( $order ) && $order instanceof \WC_Order ) ? $order : null;

$ff_extras = [
	'customer_note'      => isset( $customer_note ) ? (string) $customer_note : '',
	'additional_content' => isset( $additional_content ) ? (string) $additional_content : '',
	'user_login'         => isset( $user_login ) ? (string) $user_login : '',
	'user_display_name'  => isset( $user_display_name ) ? (string) $user_display_name : '',
	'user_id'            => isset( $user_id ) ? (string) $user_id : '',
	'reset_key'          => isset( $reset_key ) ? (string) $reset_key : '',
	'set_password_url'   => isset( $set_password_url ) ? (string) $set_password_url : '',
	'pos_store_name'     => isset( $pos_store_name ) ? (string) $pos_store_name : '',
	'pos_store_email'    => isset( $pos_store_email ) ? (string) $pos_store_email : '',
	'pos_store_phone'    => isset( $pos_store_phone_number ) ? (string) $pos_store_phone_number : '',
	'pos_store_address'  => isset( $pos_store_address ) ? (string) $pos_store_address : '',
	'pos_refund_policy'  => isset( $pos_refund_returns_policy ) ? (string) $pos_refund_returns_policy : '',
	'refund_id'          => ( isset( $refund ) && $refund instanceof \WC_Order_Refund ) ? (string) $refund->get_id() : '',
	'gateway_title'      => isset( $gateway_title ) ? (string) $gateway_title : '',
	'gateway_url'        => isset( $gateway_settings_url ) ? (string) $gateway_settings_url : '',
	'verify_url'         => isset( $verify_url ) ? (string) $verify_url : '',
	'user_email'         => isset( $user_email ) ? (string) $user_email : '',
	'sent_to_admin'      => ! empty( $sent_to_admin ),
];

$ff_ctx  = new RenderContext( type: $ff_id, order: $ff_order, email: $ff_email, extras: $ff_extras );
$ff_tree = WooTemplates::tree_for( $ff_id );

// The renderer returns a complete email document (<html>, <head>, table shell)
// with every dynamic value escaped by context inside the element render
// methods: esc_html() for text, esc_attr() for inline styles, esc_url() for
// links, and wp_kses() with an explicit tag list for WooCommerce total markup.
// wp_kses_post() cannot be applied here: it strips the document shell the email
// client needs, and the sink is a mail body passed to wp_mail(), not a page.
echo Renderer::instance()->render_tree( $ff_tree, $ff_ctx ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- renderer output is pre-escaped email HTML.
// phpcs:enable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
