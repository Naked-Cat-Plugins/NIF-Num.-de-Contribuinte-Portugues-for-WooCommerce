/**
 * External dependencies
 */
import classnames from 'classnames';
import { __, sprintf } from '@wordpress/i18n';
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
		validation: {
			setValidationErrors,
			getValidationError,
			clearValidationError,
		},
	} = props;

	const { extensions } = useSelect((select) => {
		const store = select(CART_STORE_KEY);
		const cartData = store.getCartData();
		return {
			extensions: cartData.extensions,
		};
	});

	const [isFocus, setIsFocus] = useState(false);
	const [billingNif, setBillingNif] = useState(
		extensions['ptwoo-nif']?.billingNif
	);

	const error = getValidationError('billing-nif-required');
	const hasError = error?.hidden === false && error?.message !== '';

	useEffect(() => {
		if (billingNif) {
			clearValidationError('billing-nif-required');
		} else {
			setValidationErrors({
				['billing-nif-required']: {
					message: sprintf(
						__(
							/* translators: %s field label */
							'Please enter a valid %s',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						),
						label
					),
					hidden: true,
				},
			});
		}
		return () => {
			clearValidationError('billing-nif-required');
		};
	}, [billingNif, clearValidationError, setValidationErrors]);

	const onChange = (event) => {
		const { value: nextValue } = event.target;
		setBillingNif(nextValue);
	};

	// Send data to the Store API.
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
							'is-active': isFocus || billingNif,
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
						onFocus={() => setIsFocus(true)}
						onBlur={() => setIsFocus(false)}
						aria-invalid={hasError === true}
						value={billingNif || ''}
					/>
					<label htmlFor="billing_nif">
						{sprintf(
							'%s%s',
							label,
							isRequired === true
								? ''
								: ` ${__(
										'(optional)',
										'nif-num-de-contribuinte-portugues-for-woocommerce'
									)}`
						)}
					</label>
					{hasError && (
						<div
							className="wc-block-components-validation-error"
							role="alert"
						>
							<p>{error.message}</p>
						</div>
					)}
				</div>
			</FormStep>
		</div>
	);
};

export default withFilteredAttributes(attributes)(Block);
