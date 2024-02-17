/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { TextInput } from '@woocommerce/blocks-checkout';

/**
 * Internal dependencies
 */
import FormStep from './edit/form-step';

export default function Edit({ attributes, setAttributes }) {
	const { showStepNumber, label, isRequired, validate } = attributes;
	const blockProps = useBlockProps();

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__(
						'Form Step Options',
						'nif-num-de-contribuinte-portugues-for-woocommerce'
					)}
				>
					<ToggleControl
						label={__(
							'Show step number',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						)}
						checked={showStepNumber}
						onChange={() =>
							setAttributes({
								showStepNumber: !showStepNumber,
							})
						}
					/>
				</PanelBody>
				<PanelBody
					title={__(
						'NIF Options',
						'nif-num-de-contribuinte-portugues-for-woocommerce'
					)}
				>
					<TextControl
						label={__(
							'Label',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						)}
						value={label}
						onChange={(value) => setAttributes({ label: value })}
					/>
					<ToggleControl
						label={__(
							'Required',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						)}
						checked={isRequired}
						onChange={(value) =>
							setAttributes({ isRequired: value })
						}
					/>
					<ToggleControl
						label={__(
							'Validate',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						)}
						checked={validate}
						onChange={(value) => setAttributes({ validate: value })}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<FormStep setAttributes={setAttributes} attributes={attributes}>
					<div
						aria-disabled="true"
						style={{
							userSelect: 'none',
							pointerEvents: 'none',
							cursor: 'normal',
						}}
					>
						<TextInput
							label={label}
							required={isRequired}
							value=""
						/>
					</div>
				</FormStep>
			</div>
		</>
	);
}
