/**
 * Portuguese NIF/NIPC check-digit validator.
 * Mirrors woocommerce_valida_nif() in woocommerce_nif.php (always ignores first digit).
 *
 * @param {string} nif
 * @return {boolean}
 */
export const validaNif = ( nif ) => {
	nif = String( nif ).replace( /\s+/g, '' );
	if ( ! /^\d{9}$/.test( nif ) || nif === '000000000' ) return false;
	const digits = nif.split( '' ).map( Number );
	let sum = 0;
	for ( let i = 0; i < 8; i++ ) {
		sum += digits[ i ] * ( 9 - i );
	}
	let check = 11 - ( sum % 11 );
	if ( check >= 10 ) check = 0;
	return check === digits[ 8 ];
};

/**
 * Determines whether the current NIF state is valid.
 * Mirrors is_nif_valid() in ptwoo-nif-extend-store-endpoint.php.
 *
 * @param {string}  billingNif
 * @param {boolean} isRequired
 * @param {boolean} validate
 * @param {boolean} showAllCountries
 * @param {string}  billingCountry
 * @return {boolean}
 */
export const computeIsNifValid = (
	billingNif,
	isRequired,
	validate,
	showAllCountries,
	billingCountry
) => {
	if ( ! isRequired && validate && ! billingNif ) return true;
	if ( isRequired && ! billingNif ) return false;
	if ( ! validate ) return true;
	if ( ! showAllCountries && 'PT' !== billingCountry ) return true;
	return validaNif( billingNif );
};

/**
 * Given some block attributes, gets attributes from the dataset or uses defaults.
 *
 * @param {Object} blockAttributes Object containing block attributes.
 * @param {Array}  rawAttributes   Dataset from DOM.
 * @return {Array} Array of parsed attributes.
 */
export const getValidBlockAttributes = (blockAttributes, rawAttributes) => {
	const attributes = [];

	Object.keys(blockAttributes).forEach((key) => {
		if (typeof rawAttributes[key] !== 'undefined') {
			switch (blockAttributes[key].type) {
				case 'boolean':
					attributes[key] =
						rawAttributes[key] !== 'false' &&
						rawAttributes[key] !== false;
					break;
				case 'number':
					attributes[key] = parseInt(rawAttributes[key], 10);
					break;
				case 'array':
				case 'object':
					attributes[key] = JSON.parse(rawAttributes[key]);
					break;
				default:
					attributes[key] = rawAttributes[key];
					break;
			}
		} else {
			attributes[key] = blockAttributes[key].default;
		}
	});

	return attributes;
};

/**
 * HOC that filters given attributes by valid block attribute values, or uses defaults if undefined.
 *
 * @param {Object} blockAttributes Component being wrapped.
 */
export const withFilteredAttributes =
	(blockAttributes) => (OriginalComponent) => {
		return (ownProps) => {
			const validBlockAttributes = getValidBlockAttributes(
				blockAttributes,
				ownProps
			);

			return (
				<OriginalComponent {...ownProps} {...validBlockAttributes} />
			);
		};
	};
