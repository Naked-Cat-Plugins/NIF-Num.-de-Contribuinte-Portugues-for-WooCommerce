/**
 * External dependencies
 */
import classnames from 'classnames';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { getSetting } from '@woocommerce/settings';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { withFilteredAttributes } from './utils';
import attributes from './attributes';
import FormStep from './frontend/form-step';

const CART_STORE_KEY = 'wc/store/cart';
const { defaultLabel, defaultIsRequired, defaultValidate } = getSetting(
	'ptwoo_nif_data',
	''
);

const Block = (props) => {
	const {
		stepTitle,
		stepDescription,
		showStepNumber,
		label,
		isRequired,
		validate,
		className,
	} = props;

	const { extensions } = useSelect((select) => {
		const store = select(CART_STORE_KEY);
		const cartData = store.getCartData();
		return {
			extensions: cartData.extensions,
		};
	});

	console.log(props);

	const [isActive, setIsActive] = useState(false);
	const [nif, setNif] = useState(
		extensions['ptwoo_nif']?.nif
	);

	const hasError = false;

	return (
		<div className={className}>
			<FormStep
				title={stepTitle}
				description={stepDescription}
				showStepNumber={showStepNumber}
			>
				<div
					className={classnames(
						'wc-block-components-text-input',
						{
							'is-active': isActive || nif,
						},
						{
							'has-error': hasError,
						}
					)}
				>
					<input
						type="text"
						id="billing_nif"
						aria-label={label || defaultLabel}
						maxLength="9"
						autoComplete="on"
						required={isRequired || defaultIsRequired}
						onFocus={() => setIsActive(true)}
						onBlur={() => setIsActive(false)}
						aria-invalid={hasError === true}
						value={nif || ''}
					/>
					<label htmlFor="billing_nif">
						{label || defaultLabel}
						{isRequired === true
							? null
							: ` ${__(
									'(optional)',
									'nif-num-de-contribuinte-portugues-for-woocommerce'
								)}`}
					</label>
				</div>
			</FormStep>
		</div>
	);
};

export default withFilteredAttributes(attributes)(Block);
