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
import { withFilteredAttributes, validaNif, computeIsNifValid } from './utils';
import attributes from './attributes';
import FormStep from './frontend/form-step';

const EXTENSION_NAMESPACE = 'ptwoo-nif';
const INVALID_ERROR_ID = 'billing-nif-invalid';
const DEBOUNCE_MS = 300;

const Block = ( props ) => {
	const {
		stepTitle,
		stepDescription,
		showStepNumber,
		label,
		isRequired,
		validate,
		maxLength,
		showAllCountries,
		invalidMessage,
		className,
		validation: {
			setValidationErrors,
			getValidationError,
			clearValidationError,
		},
	} = props;

	const { extensions, billingCountry } = useSelect( ( select ) => {
		const store = select( CART_STORE_KEY );
		const { extensions, billingAddress } = store.getCartData();
		const { country: billingCountry } = billingAddress;
		return {
			billingCountry,
			extensions,
		};
	} );

	const {
		__internalIncrementCalculating: disablePlaceOrderButton,
		__internalDecrementCalculating: enablePlaceOrderButton,
	} = useDispatch( CHECKOUT_STORE_KEY );

	const [ isFocus, setIsFocus ] = useState( false );
	const [ billingNif, setBillingNif ] = useState(
		extensions[ EXTENSION_NAMESPACE ]?.billingNif
	);
	const [ prevBillingNif, setPrevBillingNif ] = useState(
		extensions[ EXTENSION_NAMESPACE ]?.billingNif
	);
	const [ hasSyncedInitialValue, setHasSyncedInitialValue ] = useState( false );

	// The cart's extension data (and therefore the customer's saved NIF) is
	// fetched asynchronously, so it's not yet available when the state above
	// is initialized. Once it arrives, sync it into the field a single time
	// so it doesn't overwrite anything the customer has already typed.
	useEffect( () => {
		const savedBillingNif = extensions[ EXTENSION_NAMESPACE ]?.billingNif;
		if ( ! hasSyncedInitialValue && savedBillingNif ) {
			setBillingNif( savedBillingNif );
			setPrevBillingNif( savedBillingNif );
			setHasSyncedInitialValue( true );
		}
	}, [ extensions[ EXTENSION_NAMESPACE ]?.billingNif, hasSyncedInitialValue ] );

	const displayBillingNif =
		showAllCountries || ( ! showAllCountries && 'PT' === billingCountry );

	// Client-side validation — mirrors computeIsNifValid() / validaNif() in utils.js,
	// which in turn mirror the PHP implementations in woocommerce_nif.php and
	// ptwoo-nif-extend-store-endpoint.php.
	// Errors are set immediately but hidden while the field is focused, so they
	// surface only on blur or when the form is submitted.
	useEffect( () => {
		if (
			computeIsNifValid(
				billingNif,
				isRequired,
				validate,
				showAllCountries,
				billingCountry
			)
		) {
			clearValidationError( INVALID_ERROR_ID );
		} else {
			setValidationErrors( {
				[ INVALID_ERROR_ID ]: {
					message: invalidMessage,
					hidden: isFocus,
				},
			} );
		}
		return () => clearValidationError( INVALID_ERROR_ID );
	}, [
		billingNif,
		isFocus,
		validate,
		isRequired,
		showAllCountries,
		billingCountry,
		invalidMessage,
		clearValidationError,
		setValidationErrors,
	] );

	// Sync value to the WC session via Store API. Debounced so the button is
	// never disabled mid-typing and only one request is sent after the user pauses.
	useEffect( () => {
		if ( billingNif === prevBillingNif ) {
			return;
		}

		const timer = setTimeout( () => {
			disablePlaceOrderButton();
			extensionCartUpdate( {
				namespace: EXTENSION_NAMESPACE,
				data: {
					billingNif,
					isRequired,
					validate,
				},
				cartPropsToReceive: [ 'extensions' ],
			} ).then( () => {
				enablePlaceOrderButton();
				setPrevBillingNif( billingNif );
			} );
		}, DEBOUNCE_MS );

		return () => clearTimeout( timer );
	}, [
		extensionCartUpdate,
		billingNif,
		isRequired,
		validate,
		disablePlaceOrderButton,
		enablePlaceOrderButton,
		prevBillingNif,
		setPrevBillingNif,
	] );

	const invalidError = getValidationError( INVALID_ERROR_ID );
	const hasError =
		invalidError?.hidden === false && invalidError?.message !== '';
	const errorMessage = invalidError?.message;

	const onChange = useCallback(
		( nextValue ) => {
			clearValidationError( INVALID_ERROR_ID );
			setBillingNif( nextValue );
		},
		[ setBillingNif, clearValidationError ]
	);

	return (
		<div className={ className }>
			{ displayBillingNif && (
				<FormStep
					title={ stepTitle }
					description={ stepDescription }
					showStepNumber={ showStepNumber }
				>
					<div
						className={ classnames(
							'wc-block-components-text-input',
							{
								'is-active': isFocus || billingNif,
							},
							{
								'has-error': hasError,
							}
						) }
					>
						<ValidatedTextInput
							type="text"
							id="billing_nif"
							aria-label={ label }
							maxLength={ maxLength }
							autoComplete="on"
							required={ isRequired }
							onChange={ onChange }
							onFocus={ () => setIsFocus( true ) }
							onBlur={ () => setIsFocus( false ) }
							aria-invalid={ hasError === true }
							value={ billingNif || '' }
						/>
						<label htmlFor="billing_nif">
							{ sprintf(
								'%s%s',
								label,
								isRequired === true
									? ''
									: ` ${ __(
											'(optional)',
											'nif-num-de-contribuinte-portugues-for-woocommerce'
									  ) }`
							) }
						</label>
						{ hasError && (
							<div
								className="wc-block-components-validation-error"
								role="alert"
							>
								<p>{ errorMessage }</p>
							</div>
						) }
					</div>
				</FormStep>
			) }
		</div>
	);
};

export default withFilteredAttributes( attributes )( Block );
