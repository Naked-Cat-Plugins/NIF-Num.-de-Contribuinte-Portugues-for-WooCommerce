/**
 * External dependencies
 */
import classnames from 'classnames';
import { __ } from '@wordpress/i18n';
import {
	PlainText,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { getSetting } from '@woocommerce/settings';
import { TextInput } from '@woocommerce/blocks-checkout';

/**
 * Internal dependencies
 */
import './style.scss';
import FormStepHeading from './form-step-heading';

const { defaultLabel, defaultIsRequired, defaultValidate } = getSetting(
	'nif_data',
	''
);

export default function Edit({ attributes, setAttributes, className }) {
	const {
		stepTitle = '',
		stepDescription = '',
		showStepNumber = true,
		label,
		isRequired,
		validate,
	} = attributes;

	const blockProps = useBlockProps({
		className: classnames('wc-block-components-checkout-step', className, {
			'wc-block-components-checkout-step--with-step-number':
				showStepNumber,
		}),
	});

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
						value={label || defaultLabel}
						onChange={(value) => setAttributes({ label: value })}
					/>
					<ToggleControl
						label={__(
							'Required',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						)}
						checked={isRequired || defaultIsRequired}
						onChange={(value) =>
							setAttributes({ isRequired: value })
						}
					/>
					<ToggleControl
						label={__(
							'Validate',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						)}
						checked={validate || defaultValidate}
						onChange={(value) => setAttributes({ validate: value })}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<FormStepHeading>
					<PlainText
						value={stepTitle}
						onChange={(value) =>
							setAttributes({ stepTitle: value })
						}
						style={{ backgroundColor: 'transparent' }}
					/>
				</FormStepHeading>

				<div className="wc-block-components-checkout-step__container">
					<p className="wc-block-components-checkout-step__description">
						<PlainText
							className={
								!stepDescription
									? 'wc-block-components-checkout-step__description-placeholder'
									: ''
							}
							value={stepDescription}
							placeholder={__(
								'Optional text for this form step.',
								'nif-num-de-contribuinte-portugues-for-woocommerce'
							)}
							onChange={(value) =>
								setAttributes({
									stepDescription: value,
								})
							}
							style={{ backgroundColor: 'transparent' }}
						/>
					</p>
					<div
						className="wc-block-components-checkout-step__content"
						aria-disabled="true"
						style={{
							userSelect: 'none',
							pointerEvents: 'none',
							cursor: 'normal',
						}}
					>
						<TextInput
							label={label || defaultLabel}
							required={isRequired}
							value=""
						/>
					</div>
				</div>
			</div>
		</>
	);
}
