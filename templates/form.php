<?php
/**
 * Frontend form template. Rendered by Frontend\Shortcode::render() which
 * provides $form (Domain\Forms\Form) and $brand (hex string).
 *
 * @var \Flexa\FormFlow\Domain\Forms\Form $form
 * @var string                            $brand
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

$ff_settings     = $form->settings();
$ff_submit_label = (string) ( $ff_settings['submit_label'] ?? '' );
if ( '' === $ff_submit_label ) {
	$ff_submit_label = __( 'Send', 'flexa-formflow' );
}
?>
<form class="flexa-formflow-form" data-uuid="<?php echo esc_attr( $form->uuid ); ?>" method="post" novalidate style="--ff-brand: <?php echo esc_attr( $brand ); ?>;">
	<div class="flexa-formflow-form__fields">
		<?php foreach ( $form->fields() as $ff_field ) : ?>
			<?php
			$ff_id       = (string) ( $ff_field['id'] ?? '' );
			$ff_type     = (string) ( $ff_field['type'] ?? 'text' );
			$ff_label    = (string) ( $ff_field['label'] ?? '' );
			$ff_required = ! empty( $ff_field['required'] );
			$ff_ph       = (string) ( $ff_field['placeholder'] ?? '' );
			$ff_options  = is_array( $ff_field['options'] ?? null ) ? $ff_field['options'] : [];
			$ff_width_map = [
				'full'       => 'full',
				'half'       => 'half',
				'third'      => 'third',
				'two_thirds' => 'two-thirds',
			];
			$ff_width     = $ff_width_map[ $ff_field['width'] ?? 'full' ] ?? 'full';
			// Tablet/mobile: 'inherit' (or unknown) yields '' so no attribute is
			// emitted and the field keeps the larger breakpoint's width.
			$ff_w_tablet  = $ff_width_map[ $ff_field['widthTablet'] ?? 'inherit' ] ?? '';
			$ff_w_mobile  = $ff_width_map[ $ff_field['widthMobile'] ?? 'inherit' ] ?? '';
			$ff_dom_id   = 'ff-' . $form->uuid . '-' . $ff_id;
			if ( '' === $ff_id ) {
				continue;
			}
			?>
			<?php if ( 'hidden' === $ff_type ) : ?>
				<input type="hidden" name="<?php echo esc_attr( $ff_id ); ?>" value="<?php echo esc_attr( $ff_ph ); ?>" />
				<?php continue; ?>
			<?php endif; ?>
			<div class="flexa-formflow-field" data-field="<?php echo esc_attr( $ff_id ); ?>" data-ff-w="<?php echo esc_attr( $ff_width ); ?>"<?php echo '' !== $ff_w_tablet ? ' data-ff-w-tablet="' . esc_attr( $ff_w_tablet ) . '"' : ''; ?><?php echo '' !== $ff_w_mobile ? ' data-ff-w-mobile="' . esc_attr( $ff_w_mobile ) . '"' : ''; ?>>
				<?php if ( in_array( $ff_type, [ 'radio', 'checkbox' ], true ) ) : ?>
					<fieldset>
						<legend>
							<?php echo esc_html( $ff_label ); ?>
							<?php if ( $ff_required ) : ?><span class="flexa-formflow-required" aria-hidden="true">*</span><?php endif; ?>
						</legend>
						<?php foreach ( $ff_options as $ff_index => $ff_option ) : ?>
							<label class="flexa-formflow-choice">
								<input
									type="<?php echo esc_attr( $ff_type ); ?>"
									name="<?php echo esc_attr( $ff_id ); ?>"
									value="<?php echo esc_attr( (string) $ff_option ); ?>"
									<?php echo ( $ff_required && 'radio' === $ff_type ) ? 'required' : ''; ?>
								/>
								<span><?php echo esc_html( (string) $ff_option ); ?></span>
							</label>
						<?php endforeach; ?>
					</fieldset>
				<?php else : ?>
					<label for="<?php echo esc_attr( $ff_dom_id ); ?>">
						<?php echo esc_html( $ff_label ); ?>
						<?php if ( $ff_required ) : ?><span class="flexa-formflow-required" aria-hidden="true">*</span><?php endif; ?>
					</label>
					<?php if ( 'textarea' === $ff_type ) : ?>
						<textarea
							id="<?php echo esc_attr( $ff_dom_id ); ?>"
							name="<?php echo esc_attr( $ff_id ); ?>"
							rows="5"
							placeholder="<?php echo esc_attr( $ff_ph ); ?>"
							<?php echo $ff_required ? 'required' : ''; ?>
						></textarea>
					<?php elseif ( 'select' === $ff_type ) : ?>
						<select id="<?php echo esc_attr( $ff_dom_id ); ?>" name="<?php echo esc_attr( $ff_id ); ?>" <?php echo $ff_required ? 'required' : ''; ?>>
							<option value=""><?php echo esc_html__( 'Choose…', 'flexa-formflow' ); ?></option>
							<?php foreach ( $ff_options as $ff_option ) : ?>
								<option value="<?php echo esc_attr( (string) $ff_option ); ?>"><?php echo esc_html( (string) $ff_option ); ?></option>
							<?php endforeach; ?>
						</select>
					<?php else : ?>
						<input
							type="<?php echo esc_attr( in_array( $ff_type, [ 'email', 'number', 'date' ], true ) ? $ff_type : 'text' ); ?>"
							id="<?php echo esc_attr( $ff_dom_id ); ?>"
							name="<?php echo esc_attr( $ff_id ); ?>"
							placeholder="<?php echo esc_attr( $ff_ph ); ?>"
							<?php echo $ff_required ? 'required' : ''; ?>
						/>
					<?php endif; ?>
				<?php endif; ?>
				<p class="flexa-formflow-error" data-error-for="<?php echo esc_attr( $ff_id ); ?>" hidden></p>
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

	<p class="flexa-formflow-message" role="status" aria-live="polite" hidden></p>

	<button type="submit" class="flexa-formflow-submit">
		<span><?php echo esc_html( $ff_submit_label ); ?></span>
	</button>
</form>
