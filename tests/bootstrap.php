<?php
/**
 * Unit-test bootstrap: just enough of WordPress, in memory, to run the plugin's
 * pure logic (patterns, tokens, layout parts, spam layers, settings secrets)
 * without a database or a WordPress install. Tests that need real WordPress
 * belong in an integration suite.
 *
 * Works under PHPUnit (`composer test`) and under tests/run.php, a tiny runner
 * for machines where PHPUnit cannot be installed.
 */

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'MINUTE_IN_SECONDS', 60 );
define( 'HOUR_IN_SECONDS', 3600 );
define( 'DAY_IN_SECONDS', 86400 );
define( 'FLEXA_FORMFLOW_VERSION', 'test' );
define( 'FLEXA_FORMFLOW_PATH', dirname( __DIR__ ) . '/' );
define( 'FLEXA_FORMFLOW_URL', 'https://example.test/wp-content/plugins/flexa-formflow/' );
define( 'FLEXA_FORMFLOW_REST_NAMESPACE', 'flexa-formflow/v1' );
define( 'ENT_HTML_QUOTES', ENT_QUOTES );

spl_autoload_register(
	static function ( string $class ): void {
		$map = [
			'Flexa\\FormFlow\\Tests\\' => __DIR__ . '/',
			'Flexa\\FormFlow\\'        => dirname( __DIR__ ) . '/src/',
		];
		foreach ( $map as $prefix => $dir ) {
			if ( str_starts_with( $class, $prefix ) ) {
				$file = $dir . str_replace( '\\', '/', substr( $class, strlen( $prefix ) ) ) . '.php';
				if ( is_readable( $file ) ) {
					require $file;
				}
				return;
			}
		}
	}
);

/** In-memory WordPress state the stubs read and write; tests reset it. */
final class WP_Test_State {
	/** @var array<string, mixed> */
	public static array $options = [];
	/** @var array<string, list<array{0: callable, 1: int}>> */
	public static array $filters = [];
	/** @var callable|null */
	public static $http = null;
	/** @var list<array{url: string, args: array<string, mixed>}> */
	public static array $requests = [];
	public static string $logo = '';

	public static function reset(): void {
		self::$options  = [];
		self::$filters  = [];
		self::$http     = null;
		self::$requests = [];
		self::$logo     = '';
	}
}

class WP_Error {
	/** @param array<string, mixed>|mixed $data */
	public function __construct( public string $code = '', public string $message = '', public mixed $data = null ) {}
	public function get_error_code(): string {
		return $this->code;
	}
	public function get_error_message(): string {
		return $this->message;
	}
	public function get_error_data(): mixed {
		return $this->data;
	}
}

function __( string $text, string $domain = '' ): string {
	return $text;
}
function _n( string $single, string $plural, int $n, string $domain = '' ): string {
	return 1 === $n ? $single : $plural;
}
function esc_html( string $text ): string {
	return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
}
function esc_attr( string $text ): string {
	return htmlspecialchars( $text, ENT_QUOTES, 'UTF-8' );
}
function esc_html__( string $text, string $domain = '' ): string {
	return esc_html( $text );
}
function esc_attr__( string $text, string $domain = '' ): string {
	return esc_attr( $text );
}
function esc_url( string $url ): string {
	$url = trim( $url );
	return 1 === preg_match( '#^(https?://|mailto:|/|\#)#i', $url ) ? htmlspecialchars( $url, ENT_QUOTES, 'UTF-8' ) : '';
}
function esc_url_raw( string $url ): string {
	return 1 === preg_match( '#^(https?://|mailto:)#i', trim( $url ) ) ? trim( $url ) : '';
}
function sanitize_key( string $key ): string {
	return (string) preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $key ) );
}
function sanitize_text_field( string $text ): string {
	return trim( (string) preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( $text ) ) );
}
function sanitize_textarea_field( string $text ): string {
	return trim( strip_tags( $text ) );
}
function absint( mixed $n ): int {
	return abs( (int) $n );
}
function wp_unslash( mixed $value ): mixed {
	return is_string( $value ) ? stripslashes( $value ) : $value;
}
/** @param array<string, mixed> $allowed */
function wp_kses( string $html, array $allowed ): string {
	return strip_tags( $html, array_map( static fn( $t ) => '<' . $t . '>', array_keys( $allowed ) ) );
}
function wp_kses_post( string $html ): string {
	$html = (string) preg_replace( '#<(script|style|iframe)[^>]*>.*?</\1>#is', '', $html );
	return (string) preg_replace( '/\son\w+="[^"]*"/i', '', $html );
}
function wp_strip_all_tags( string $text ): string {
	return trim( strip_tags( $text ) );
}
function wp_specialchars_decode( string $text, int $flags = ENT_QUOTES ): string {
	return htmlspecialchars_decode( $text, $flags );
}
function wp_json_encode( mixed $data ): string|false {
	return json_encode( $data );
}
function add_filter( string $hook, callable $callback, int $priority = 10, int $args = 1 ): bool {
	WP_Test_State::$filters[ $hook ][] = [ $callback, $args ];
	return true;
}
function add_action( string $hook, callable $callback, int $priority = 10, int $args = 1 ): bool {
	return add_filter( $hook, $callback, $priority, $args );
}
function apply_filters( string $hook, mixed $value, mixed ...$rest ): mixed {
	foreach ( WP_Test_State::$filters[ $hook ] ?? [] as [ $callback, $count ] ) {
		$value = $callback( ...array_slice( array_merge( [ $value ], $rest ), 0, max( 1, $count ) ) );
	}
	return $value;
}
function do_action( string $hook, mixed ...$args ): void {
	foreach ( WP_Test_State::$filters[ $hook ] ?? [] as [ $callback, $count ] ) {
		$callback( ...array_slice( $args, 0, $count ) );
	}
}
function get_option( string $key, mixed $default = false ): mixed {
	return WP_Test_State::$options[ $key ] ?? $default;
}
function update_option( string $key, mixed $value, mixed $autoload = null ): bool {
	WP_Test_State::$options[ $key ] = $value;
	return true;
}
function delete_option( string $key ): bool {
	unset( WP_Test_State::$options[ $key ] );
	return true;
}
function get_bloginfo( string $show = '' ): string {
	return match ( $show ) {
		'name'        => 'Acme &amp; Co',
		'description' => 'Just another site',
		'language'    => 'en-US',
		default       => '',
	};
}
function home_url( string $path = '' ): string {
	return 'https://example.test' . $path;
}
function site_url( string $path = '' ): string {
	return 'https://example.test' . $path;
}
function admin_url( string $path = '' ): string {
	return 'https://example.test/wp-admin/' . $path;
}
function wp_parse_url( string $url, int $component = -1 ): mixed {
	return parse_url( $url, $component );
}
function get_theme_mod( string $name, mixed $default = false ): mixed {
	return 'custom_logo' === $name && '' !== WP_Test_State::$logo ? 7 : $default;
}
function wp_get_attachment_image_url( int $id, string $size = 'thumbnail' ): string|false {
	return '' !== WP_Test_State::$logo ? WP_Test_State::$logo : false;
}
function date_i18n( string $format, int|bool|null $ts = null ): string {
	return gmdate( 'Y-m-d', is_int( $ts ) ? $ts : time() );
}
function wp_salt( string $scheme = 'auth' ): string {
	return 'test-salt-' . $scheme;
}
function wp_rand( int $min = 0, int $max = 0 ): int {
	return random_int( $min, $max );
}
function wp_generate_password( int $length = 12, bool $special = true ): string {
	return substr( bin2hex( random_bytes( $length ) ), 0, $length );
}
function is_wp_error( mixed $thing ): bool {
	return $thing instanceof WP_Error;
}
/** @param array<string, mixed> $args */
function wp_remote_post( string $url, array $args = [] ): mixed {
	WP_Test_State::$requests[] = [
		'url'  => $url,
		'args' => $args,
	];
	$handler = WP_Test_State::$http;
	return null !== $handler ? $handler( $url, $args ) : new WP_Error( 'http_request_failed', 'no handler' );
}
function wp_remote_retrieve_response_code( mixed $response ): int {
	return is_array( $response ) ? (int) ( $response['response']['code'] ?? 0 ) : 0;
}
function wp_remote_retrieve_body( mixed $response ): string {
	return is_array( $response ) ? (string) ( $response['body'] ?? '' ) : '';
}
function sanitize_hex_color( string $color ): ?string {
	if ( '' === $color ) {
		return '';
	}
	return 1 === preg_match( '/^#([A-Fa-f0-9]{3}){1,2}$/', $color ) ? $color : null;
}
function get_transient( string $key ): mixed {
	return WP_Test_State::$options[ '_transient_' . $key ] ?? false;
}
function set_transient( string $key, mixed $value, int $ttl = 0 ): bool {
	WP_Test_State::$options[ '_transient_' . $key ] = $value;
	return true;
}
function get_locale(): string {
	return 'en_US';
}
