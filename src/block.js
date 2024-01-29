/**
 * External dependencies
 */
import classnames from 'classnames';
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useState, useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	extensionCartUpdate,
	ValidatedTextInput,
} from '@woocommerce/blocks-checkout';
import { CART_STORE_KEY, CHECKOUT_STORE_KEY } from '@woocommerce/block-data';

/**
 * Internal dependencies
 */
import { withFilteredAttributes } from './utils';
import attributes from './attributes';
import FormStep from './frontend/form-step';

const EXTENSION_NAMESPACE = 'ptwoo-nif';
const INVALID_ERROR_ID = 'billing-nif-invalid';

const Block = (props) => {
	const {
		stepTitle,
		stepDescription,
		showStepNumber,
		label,
		isRequired,
		validate,
		maxLength,
		showAllCountries,
		className,
		validation: {
			setValidationErrors,
			getValidationError,
			clearValidationError,
		},
	} = props;

	const { extensions, billingCountry } = useSelect((select) => {
		const store = select(CART_STORE_KEY);
		const { extensions, billingAddress } = store.getCartData();
		const { country: billingCountry } = billingAddress;
		return {
			billingCountry,
			extensions,
		};
	});

	const {
		__internalIncrementCalculating: disablePlaceOrderButton,
		__internalDecrementCalculating: enablePlaceOrderButton,
	} = useDispatch(CHECKOUT_STORE_KEY);

	const [isFocus, setIsFocus] = useState(false);
	const [billingNif, setBillingNif] = useState(
		extensions[EXTENSION_NAMESPACE]?.billingNif
	);
	const [prevBillingNif, setPrevBillingNif] = useState(
		extensions[EXTENSION_NAMESPACE]?.billingNif
	);

	const displayBillingNif =
		showAllCountries || (!showAllCountries && 'PT' === billingCountry);

	const invalidError = getValidationError(INVALID_ERROR_ID);
	const hasError = invalidError?.hidden === false && invalidError?.message;
	const errorMessage = invalidError?.message;

	useEffect(() => {
		if (extensions[EXTENSION_NAMESPACE]?.isValid) {
			clearValidationError(INVALID_ERROR_ID);
		} else {
			setValidationErrors({
				[INVALID_ERROR_ID]: {
					message: sprintf(
						__(
							/* translators: %s field label */
							'Please enter a valid %s',
							'nif-num-de-contribuinte-portugues-for-woocommerce'
						),
						label
					),
					hidden: false,
				},
			});
		}
		return () => {
			clearValidationError(INVALID_ERROR_ID);
		};
	}, [extensions[EXTENSION_NAMESPACE], billingNif]);

	// Send data to the Store API.
	useEffect(() => {
		if (billingNif !== prevBillingNif) {
			disablePlaceOrderButton();
			extensionCartUpdate({
				namespace: EXTENSION_NAMESPACE,
				data: {
					billingNif,
					validate,
				},
				cartPropsToReceive: ['extensions'],
			}).then(() => {
				enablePlaceOrderButton();
				setPrevBillingNif(billingNif);
			});
		}
	}, [
		extensionCartUpdate,
		billingNif,
		validate,
		disablePlaceOrderButton,
		enablePlaceOrderButton,
		prevBillingNif,
		setPrevBillingNif,
	]);

	// Callback for the input's onChange event.
	const onChange = useCallback(
		(nextValue) => {
			clearValidationError(INVALID_ERROR_ID);

			if (nextValue.length === 0 && isRequired) {
				setValidationErrors({
					[INVALID_ERROR_ID]: {
						message: sprintf(
							__(
								/* translators: %s field label */
								'Please enter a valid %s',
								'nif-num-de-contribuinte-portugues-for-woocommerce'
							),
							label
						),
						hidden: false,
					},
				});
			}

			setBillingNif(nextValue);
		},
		[setBillingNif, clearValidationError, setValidationErrors]
	);

	return (
		<div className={className}>
			{displayBillingNif && (
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
						<ValidatedTextInput
							type="text"
							id="billing_nif"
							aria-label={label}
							maxLength={maxLength}
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
								<p>{errorMessage}</p>
							</div>
						)}
					</div>
				</FormStep>
			)}
		</div>
	);
};

export default withFilteredAttributes(attributes)(Block);
