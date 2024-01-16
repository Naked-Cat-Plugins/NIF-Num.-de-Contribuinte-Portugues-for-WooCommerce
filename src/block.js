/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { CheckboxControl } from '@woocommerce/blocks-checkout';
import { getSetting } from '@woocommerce/settings';
import { useSelect, useDispatch } from '@wordpress/data';

const { optInDefaultText } = getSetting('nif_data', '');

const Block = ({ className, children, checkoutExtensionData }) => {
	const [checked, setChecked] = useState(false);
	const { setExtensionData } = checkoutExtensionData;

	const { setValidationErrors, clearValidationError } = useDispatch(
		'wc/store/validation'
	);

	useEffect(() => {
		setExtensionData('nif', 'optin', checked);
		if (!checked) {
			setValidationErrors({
				nif: {
					message: __('Please tick the box', 'nif'),
					hidden: false,
				},
			});
			return;
		}
		clearValidationError('nif');
	}, [clearValidationError, setValidationErrors, checked, setExtensionData]);

	const { validationError } = useSelect((select) => {
		const store = select('wc/store/validation');
		return {
			validationError: store.getValidationError('nif'),
		};
	});

	return (
		<div className={className}>
			<CheckboxControl
				id="nif-checkbox"
				checked={checked}
				onChange={setChecked}
			>
				{children?.[0] || optInDefaultText}
			</CheckboxControl>

			{validationError?.hidden === false && (
				<div>
					<span role="img" aria-label={__('Warning emoji', 'nif')}>
						⚠️
					</span>
					{validationError?.message}
				</div>
			)}
		</div>
	);
};

export default Block;
