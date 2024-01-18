/**
 * External dependencies
 */
import classnames from 'classnames';
import { __ } from '@wordpress/i18n';
import { useEffect, useState } from '@wordpress/element';
import { extensionCartUpdate } from '@woocommerce/blocks-checkout';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { withFilteredAttributes } from './utils';
import attributes from './attributes';
import FormStep from './frontend/form-step';

const CART_STORE_KEY = 'wc/store/cart';

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

	const [isActive, setIsActive] = useState(false);
	const [billingNif, setBillingNif] = useState(
		extensions['ptwoo-nif']?.billingNif
	);

	const hasError = false;

	const onChange = (event) => {
		const { value: nextValue } = event.target;
		setBillingNif(nextValue);
	};

	useEffect(() => {
		extensionCartUpdate({
			namespace: 'ptwoo-nif',
			data: {
				billingNif,
			},
		});
	}, [extensionCartUpdate, billingNif]);

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
							'is-active': isActive || billingNif,
						},
						{
							'has-error': hasError,
						}
					)}
				>
					<input
						type="text"
						id="billing_nif"
						aria-label={label}
						maxLength="9"
						autoComplete="on"
						required={isRequired}
						onChange={onChange}
						onFocus={() => setIsActive(true)}
						onBlur={() => setIsActive(false)}
						aria-invalid={hasError === true}
						value={billingNif || ''}
					/>
					<label htmlFor="billing_nif">
						{label}
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
