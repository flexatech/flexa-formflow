<?php
/**
 * Frontend form template. Rendered by Frontend\Shortcode::render_markup()
 * which provides $form (Domain\Forms\Form), $brand (hex string) and $captcha
 * (Shortcode::captcha_view(), or null when the form has no CAPTCHA).
 *
 * @var \Flexa\FormFlow\Domain\Forms\Form $form
 * @var string                            $brand
 * @var array{provider: string, label: string, site_key: string, ready: bool, preview: bool, script: string, global: string}|null $captcha
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

$flexa_formflow_settings     = $form->settings();
$flexa_formflow_submit_label = (string) ( $flexa_formflow_settings['submit_label'] ?? '' );
if ( '' === $flexa_formflow_submit_label ) {
	$flexa_formflow_submit_label = __( 'Send', 'flexa-formflow' );
}
?>
<form class="flexa-formflow-form" data-uuid="<?php echo esc_attr( $form->uuid ); ?>" method="post" novalidate style="--ff-brand: <?php echo esc_attr( $brand ); ?>;">
	<div class="flexa-formflow-form__fields">
		<?php foreach ( $form->fields() as $flexa_formflow_field ) : ?>
			<?php
			$flexa_formflow_id        = (string) ( $flexa_formflow_field['id'] ?? '' );
			$flexa_formflow_type      = (string) ( $flexa_formflow_field['type'] ?? 'text' );
			$flexa_formflow_label     = (string) ( $flexa_formflow_field['label'] ?? '' );
			$flexa_formflow_required  = ! empty( $flexa_formflow_field['required'] );
			$flexa_formflow_ph        = (string) ( $flexa_formflow_field['placeholder'] ?? '' );
			$flexa_formflow_options   = is_array( $flexa_formflow_field['options'] ?? null ) ? $flexa_formflow_field['options'] : [];
			$flexa_formflow_width_map = [
				'full'       => 'full',
				'half'       => 'half',
				'third'      => 'third',
				'two_thirds' => 'two-thirds',
			];
			$flexa_formflow_width     = $flexa_formflow_width_map[ $flexa_formflow_field['width'] ?? 'full' ] ?? 'full';
			// Tablet/mobile: 'inherit' (or unknown) yields '' so no attribute is
			// emitted and the field keeps the larger breakpoint's width.
			$flexa_formflow_w_tablet = $flexa_formflow_width_map[ $flexa_formflow_field['widthTablet'] ?? 'inherit' ] ?? '';
			$flexa_formflow_w_mobile = $flexa_formflow_width_map[ $flexa_formflow_field['widthMobile'] ?? 'inherit' ] ?? '';
			$flexa_formflow_dom_id   = 'ff-' . $form->uuid . '-' . $flexa_formflow_id;
			// Single Free show/hide rule; empty when the field is always visible.
			$flexa_formflow_logic = ( is_array( $flexa_formflow_field['logic'] ?? null ) && [] !== $flexa_formflow_field['logic'] ) ? $flexa_formflow_field['logic'] : null;
			if ( '' === $flexa_formflow_id ) {
				continue;
			}
			?>
			<?php if ( 'hidden' === $flexa_formflow_type ) : ?>
				<input type="hidden" name="<?php echo esc_attr( $flexa_formflow_id ); ?>" value="<?php echo esc_attr( $flexa_formflow_ph ); ?>" />
				<?php continue; ?>
			<?php endif; ?>
			<div class="flexa-formflow-field" data-field="<?php echo esc_attr( $flexa_formflow_id ); ?>" data-ff-w="<?php echo esc_attr( $flexa_formflow_width ); ?>"<?php echo '' !== $flexa_formflow_w_tablet ? ' data-ff-w-tablet="' . esc_attr( $flexa_formflow_w_tablet ) . '"' : ''; ?><?php echo '' !== $flexa_formflow_w_mobile ? ' data-ff-w-mobile="' . esc_attr( $flexa_formflow_w_mobile ) . '"' : ''; ?><?php echo null !== $flexa_formflow_logic ? ' data-ff-logic="' . esc_attr( (string) wp_json_encode( $flexa_formflow_logic ) ) . '"' : ''; ?>>
				<?php if ( in_array( $flexa_formflow_type, [ 'radio', 'checkbox' ], true ) ) : ?>
					<fieldset>
						<legend>
							<?php echo esc_html( $flexa_formflow_label ); ?>
							<?php
							if ( $flexa_formflow_required ) :
								?>
								<span class="flexa-formflow-required" aria-hidden="true">*</span><?php endif; ?>
						</legend>
						<?php foreach ( $flexa_formflow_options as $flexa_formflow_index => $flexa_formflow_option ) : ?>
							<label class="flexa-formflow-choice">
								<input
									type="<?php echo esc_attr( $flexa_formflow_type ); ?>"
									name="<?php echo esc_attr( $flexa_formflow_id ); ?>"
									value="<?php echo esc_attr( (string) $flexa_formflow_option ); ?>"
									<?php echo ( $flexa_formflow_required && 'radio' === $flexa_formflow_type ) ? 'required' : ''; ?>
								/>
								<span><?php echo esc_html( (string) $flexa_formflow_option ); ?></span>
							</label>
						<?php endforeach; ?>
					</fieldset>
				<?php else : ?>
					<label for="<?php echo esc_attr( $flexa_formflow_dom_id ); ?>">
						<?php echo esc_html( $flexa_formflow_label ); ?>
						<?php
						if ( $flexa_formflow_required ) :
							?>
							<span class="flexa-formflow-required" aria-hidden="true">*</span><?php endif; ?>
					</label>
					<?php if ( 'textarea' === $flexa_formflow_type ) : ?>
						<textarea
							id="<?php echo esc_attr( $flexa_formflow_dom_id ); ?>"
							name="<?php echo esc_attr( $flexa_formflow_id ); ?>"
							rows="5"
							placeholder="<?php echo esc_attr( $flexa_formflow_ph ); ?>"
							<?php echo $flexa_formflow_required ? 'required' : ''; ?>
						></textarea>
					<?php elseif ( 'select' === $flexa_formflow_type ) : ?>
						<select id="<?php echo esc_attr( $flexa_formflow_dom_id ); ?>" name="<?php echo esc_attr( $flexa_formflow_id ); ?>" <?php echo $flexa_formflow_required ? 'required' : ''; ?>>
							<option value=""><?php echo esc_html__( 'Choose…', 'flexa-formflow' ); ?></option>
							<?php foreach ( $flexa_formflow_options as $flexa_formflow_option ) : ?>
								<option value="<?php echo esc_attr( (string) $flexa_formflow_option ); ?>"><?php echo esc_html( (string) $flexa_formflow_option ); ?></option>
							<?php endforeach; ?>
						</select>
					<?php else : ?>
						<input
							type="<?php echo esc_attr( in_array( $flexa_formflow_type, [ 'email', 'number', 'date' ], true ) ? $flexa_formflow_type : 'text' ); ?>"
							id="<?php echo esc_attr( $flexa_formflow_dom_id ); ?>"
							name="<?php echo esc_attr( $flexa_formflow_id ); ?>"
							placeholder="<?php echo esc_attr( $flexa_formflow_ph ); ?>"
							<?php echo $flexa_formflow_required ? 'required' : ''; ?>
						/>
					<?php endif; ?>
				<?php endif; ?>
				<p class="flexa-formflow-error" data-error-for="<?php echo esc_attr( $flexa_formflow_id ); ?>" hidden></p>
			</div>
		<?php endforeach; ?>
	</div>

	<div class="flexa-formflow-hp" aria-hidden="true">
		<label>
			<?php echo esc_html__( 'Leave this field empty', 'flexa-formflow' ); ?>
			<input type="text" name="ff_website" tabindex="-1" autocomplete="off" />
		</label>
	</div>
	<input type="hidden" name="_ff_ts" value="<?php echo esc_attr( (string) time() ); ?>" />

	<?php if ( null !== $captcha ) : ?>
		<?php if ( $captcha['preview'] ) : ?>
			<div class="flexa-formflow-captcha flexa-formflow-captcha--preview" data-provider="<?php echo esc_attr( $captcha['provider'] ); ?>">
				<div class="flexa-formflow-captcha__mock">
					<span class="flexa-formflow-captcha__box" aria-hidden="true"></span>
					<span>
						<?php echo 'recaptcha_v2' === $captcha['provider'] ? esc_html__( 'I’m not a robot', 'flexa-formflow' ) : esc_html__( 'Verify you are human', 'flexa-formflow' ); ?>
						<small><?php echo esc_html( $captcha['label'] ); ?></small>
					</span>
				</div>
				<p class="flexa-formflow-captcha__note">
					<?php echo $captcha['ready'] ? esc_html__( 'Preview only. The real widget and the server-side check run on the published form.', 'flexa-formflow' ) : esc_html__( 'This CAPTCHA has no keys yet. Add them in Settings > Spam protection before publishing.', 'flexa-formflow' ); ?>
				</p>
			</div>
		<?php else : ?>
			<div
				class="flexa-formflow-captcha"
				data-provider="<?php echo esc_attr( $captcha['provider'] ); ?>"
				data-sitekey="<?php echo esc_attr( $captcha['site_key'] ); ?>"
				data-script="<?php echo esc_url( $captcha['script'] ); ?>"
				data-global="<?php echo esc_attr( $captcha['global'] ); ?>"
				<?php echo $captcha['ready'] ? '' : 'data-unavailable="1"'; ?>
			>
				<div class="flexa-formflow-captcha__widget"></div>
				<div class="flexa-formflow-captcha__status" role="alert" hidden>
					<span class="flexa-formflow-captcha__message"></span>
					<button type="button" class="flexa-formflow-captcha__retry"><?php echo esc_html__( 'Try again', 'flexa-formflow' ); ?></button>
				</div>
			</div>
		<?php endif; ?>
	<?php endif; ?>

	<p class="flexa-formflow-message" role="status" aria-live="polite" hidden></p>

	<button type="submit" class="flexa-formflow-submit">
		<span><?php echo esc_html( $flexa_formflow_submit_label ); ?></span>
	</button>
</form>
