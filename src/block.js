/**
 * External dependencies
 */
import classnames from 'classnames';
import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useState, useCallback, useRef } from '@wordpress/element';
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
		setExtensionData,
		__internalSetExtensionData,
	} = useDispatch( CHECKOUT_STORE_KEY );
	// Public since WooCommerce 9.9, internal before that.
	const setCheckoutExtensionData = setExtensionData || __internalSetExtensionData;

	// The NIF in the cart's extension data: the one in the session, or the one saved on the
	// customer's account.
	const cartBillingNif = extensions[ EXTENSION_NAMESPACE ]?.billingNif || '';

	const [ isFocus, setIsFocus ] = useState( false );
	// The field is the only source of the NIF once it is on screen. The cart's value fills it in
	// once, and is never written back into it afterwards: every answer to a cart update carries
	// whatever the session held when that request reached the server, which is often a NIF the
	// shopper has typed over since.
	const [ billingNif, setBillingNif ] = useState( cartBillingNif );
	const hasPrefilled = useRef( '' !== cartBillingNif );
	const hasEdited = useRef( false );

	// The NIF the session is known to hold, and whether a cart update is waiting for an answer.
	const sessionNif = useRef( cartBillingNif );
	const isSyncing = useRef( false );
	const [ syncRound, setSyncRound ] = useState( 0 );

	// The cart's extension data (and therefore the customer's saved NIF) may arrive after the
	// field is on screen. Fill it in when it does, unless the shopper has already typed.
	useEffect( () => {
		if ( hasPrefilled.current || hasEdited.current || '' === cartBillingNif ) {
			return;
		}
		hasPrefilled.current = true;
		sessionNif.current = cartBillingNif;
		setBillingNif( cartBillingNif );
	}, [ cartBillingNif ] );

	// The NIF also goes with the Place Order request itself, so the order gets the one in the
	// field when it was clicked, even if the cart update below has not been sent or answered yet.
	useEffect( () => {
		if ( setCheckoutExtensionData ) {
			setCheckoutExtensionData( EXTENSION_NAMESPACE, {
				billingNif,
				isRequired,
				validate,
			} );
		}
	}, [ setCheckoutExtensionData, billingNif, isRequired, validate ] );

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

	// Keep the session up to date (it fills the field in again if the page is reloaded), through
	// a cart update sent once the shopper pauses. One at a time: a second request sent before the
	// first is answered can reach the server first and be overwritten by the older NIF. When one
	// is answered, syncRound sends the NIF typed in the meantime, if any.
	useEffect( () => {
		if ( billingNif === sessionNif.current || isSyncing.current ) {
			return;
		}

		const timer = setTimeout( () => {
			isSyncing.current = true;
			disablePlaceOrderButton();
			extensionCartUpdate( {
				namespace: EXTENSION_NAMESPACE,
				data: {
					billingNif,
					isRequired,
					validate,
				},
				cartPropsToReceive: [ 'extensions' ],
			} )
				// On failure too: the order still gets the NIF from the Place Order request, and
				// retrying here would repeat a failing request every few hundred milliseconds.
				// The next change to the field sends a new one.
				.catch( () => {} )
				.then( () => {
					sessionNif.current = billingNif;
					isSyncing.current = false;
					enablePlaceOrderButton();
					setSyncRound( ( round ) => round + 1 );
				} );
		}, DEBOUNCE_MS );

		return () => clearTimeout( timer );
	}, [
		billingNif,
		syncRound,
		isRequired,
		validate,
		disablePlaceOrderButton,
		enablePlaceOrderButton,
	] );

	const invalidError = getValidationError( INVALID_ERROR_ID );
	const hasError =
		invalidError?.hidden === false && invalidError?.message !== '';
	const errorMessage = invalidError?.message;

	const onChange = useCallback(
		( nextValue ) => {
			hasEdited.current = true;
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
