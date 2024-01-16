/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextControl } from '@wordpress/components';
import { getSetting } from '@woocommerce/settings';
import { TextInput } from '@woocommerce/blocks-checkout';

/**
 * Internal dependencies
 */
import './style.scss';

const { defaultLabel, defaultIsRequired, defaultValidate } = getSetting('nif_data', '');

export default function Edit({ attributes, setAttributes }) {
	const {
		label,
		isRequired,
		validate,
	} = attributes;
	const blockProps = useBlockProps();
	return (
		<>
			<InspectorControls>
				<PanelBody title={__('NIF Options', 'nif')}>
					<TextControl
						label={__( 'Label', 'nif-num-de-contribuinte-portugues-for-woocommerce' )}
						value={ label || defaultLabel }
						onChange={(value) => setAttributes({ label: value })}
					/>
					<ToggleControl
						label={__( 'Required', 'nif-num-de-contribuinte-portugues-for-woocommerce' )}
						checked={ isRequired || defaultIsRequired }
						onChange={(value) => setAttributes({ isRequired: value })}
					/>
					<ToggleControl
						label={__( 'Validate', 'nif-num-de-contribuinte-portugues-for-woocommerce' )}
						checked={ validate || defaultValidate }
						onChange={(value) => setAttributes({ validate: value })}
					/>
				</PanelBody>
			</InspectorControls>

			<div {...blockProps}>
				<TextInput
					label={label || defaultLabel}
					required={isRequired}
					value=""
				/>
			</div>
		</>
	);
}
