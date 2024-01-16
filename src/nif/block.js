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
			Lorem ipsum
		</div>
	);
};

export default Block;
