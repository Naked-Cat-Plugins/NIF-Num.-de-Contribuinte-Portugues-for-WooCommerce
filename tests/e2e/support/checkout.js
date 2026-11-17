/**
 * Checkout helpers for the NIF specs.
 */
const fs = require( 'fs' );
const { expect } = require( '@playwright/test' );
const { nc, STATE } = require( './wp' );

const NIF_INPUT = '#billing_nif';
const PLACE_ORDER = '.wc-block-components-checkout-place-order-button';

function state() {
	return JSON.parse( fs.readFileSync( STATE, 'utf8' ) );
}

/**
 * Add the test product to the cart and open the checkout, waiting for the NIF field.
 *
 * @param {import('@playwright/test').Page} page
 */
async function openCheckout( page ) {
	const { productId, pageId } = state();
	await page.goto( `${ nc.env.url }/?add-to-cart=${ productId }` );
	await page.goto( `${ nc.env.url }/?page_id=${ pageId }` );
	await expect( page.locator( NIF_INPUT ) ).toBeVisible( { timeout: 20_000 } );
	// The field is on screen before the checkout has finished starting up, and on a slower
	// install (ClaudeBox) typing that early lost the focus after a few keys, with or without
	// this plugin's changes. Wait for the cart to have loaded, then for the requests it starts.
	await page.waitForFunction(
		() => window.wp?.data?.select( 'wc/store/cart' )?.hasFinishedResolution( 'getCartData' ),
		null,
		{ timeout: 20_000 }
	);
	await page.waitForTimeout( 1000 );
}

/**
 * Fill the guest's billing details (the country is already Portugal, the store's default), then
 * wait for WooCommerce to save them, so the specs that follow only see NIF requests.
 *
 * @param {import('@playwright/test').Page} page
 */
async function fillGuestDetails( page ) {
	await page.fill( '#email', `nif-e2e-${ Date.now() }@example.com` );
	const fields = {
		'#billing-first_name': 'Teste',
		'#billing-last_name': 'NIF',
		'#billing-address_1': 'Rua de Teste 1',
		'#billing-city': 'Lisboa',
		'#billing-postcode': '1000-001',
	};
	for ( const [ selector, value ] of Object.entries( fields ) ) {
		const field = page.locator( selector );
		if ( await field.count() ) {
			await field.fill( value );
		}
	}
	const phone = page.locator( '#billing-phone' );
	if ( ( await phone.count() ) && ( await phone.getAttribute( 'required' ) ) !== null ) {
		await phone.fill( '912345678' );
	}
	const cod = page.locator( 'input[value="cod"]' );
	if ( await cod.count() ) {
		await cod.check();
	}
	await page.locator( '#email' ).focus();
	await page.waitForTimeout( 1500 );
}

/**
 * Place the order and return its ID, recorded for the teardown.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<number>}
 */
async function placeOrder( page ) {
	// Leave the field first. When an input loses focus, WooCommerce pushes any customer data it
	// has not sent yet (here, the billing address copied to the shipping address) and disables
	// Place Order while it does: a click that is what makes the field lose focus is then lost,
	// with this plugin or without it.
	await page.evaluate( () => document.activeElement && document.activeElement.blur() );
	await page.waitForTimeout( 1000 );
	await expect( page.locator( PLACE_ORDER ) ).toBeEnabled();
	await page.locator( PLACE_ORDER ).click();
	return waitForOrder( page );
}

/**
 * Wait for the order received page and return the order's ID, recorded for the teardown.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<number>}
 */
async function waitForOrder( page ) {
	await page.waitForURL( /order-received/, { timeout: 30_000 } );
	return recordOrder( page.url() );
}

function recordOrder( url ) {
	const match = url.match( /order-received[=/](\d+)/ );
	if ( ! match ) {
		throw new Error( `No order ID in ${ url }` );
	}
	const id = Number( match[ 1 ] );
	const s = state();
	s.orders.push( id );
	fs.writeFileSync( STATE, JSON.stringify( s, null, '\t' ) );
	return id;
}

/**
 * The NIF saved on an order.
 *
 * @param {number} orderId
 * @return {string}
 */
function orderNif( orderId ) {
	return nc.wpEval( `$o = wc_get_order( ${ Number( orderId ) } ); echo $o ? $o->get_meta( '_billing_nif' ) : '__no_order__';` );
}

/**
 * The NIF a request carries as one of the field's cart updates, or undefined when it is not one.
 * WooCommerce sends cart updates on their own (cart/extensions) or grouped (batch).
 *
 * @param {import('@playwright/test').Request} request
 * @return {string|undefined}
 */
function nifUpdateIn( request ) {
	const url = decodeURIComponent( request.url() );
	if ( 'POST' !== request.method() || ! /wc\/store\/v1\/(cart\/extensions|batch)/.test( url ) ) {
		return undefined;
	}
	let body;
	try {
		body = request.postDataJSON() || {};
	} catch ( e ) {
		return undefined;
	}
	const updates = Array.isArray( body.requests )
		? body.requests.filter( ( r ) => /cart\/extensions/.test( r.path || '' ) ).map( ( r ) => r.data || r.body || {} )
		: [ body ];
	const ours = updates.filter( ( u ) => 'ptwoo-nif' === u.namespace );
	return ours.length ? ours[ ours.length - 1 ].data.billingNif : undefined;
}

/**
 * Whether a request is one of the NIF field's cart updates.
 *
 * @param {import('@playwright/test').Request} request
 * @return {boolean}
 */
function isNifUpdate( request ) {
	return undefined !== nifUpdateIn( request );
}

/**
 * Whether a URL is one the field's cart updates may be sent to, for page.route().
 *
 * @param {URL} url
 * @return {boolean}
 */
function isStoreUpdateUrl( url ) {
	return /wc\/store\/v1\/(cart\/extensions|batch)/.test( decodeURIComponent( url.href ) );
}

/**
 * Record the NIF of every cart update the field sends, and how many are still waiting for an
 * answer, so a spec can wait until everything has settled.
 *
 * @param {import('@playwright/test').Page} page
 * @return {{sent: string[], pending: () => number, settled: () => Promise<void>}}
 */
function watchNifUpdates( page ) {
	const sent = [];
	const open = new Set();
	page.on( 'request', ( request ) => {
		if ( isNifUpdate( request ) ) {
			sent.push( nifUpdateIn( request ) );
			open.add( request );
		}
	} );
	const done = ( request ) => open.delete( request );
	page.on( 'requestfinished', done );
	page.on( 'requestfailed', done );
	return {
		sent,
		pending: () => open.size,
		// No update waiting for an answer, and none sent for a second (debounce included).
		settled: async () => {
			await expect
				.poll(
					async () => {
						// A whole second with nothing open and nothing new sent: a window that starts
						// while a request is open can end inside the debounce before the next one.
						const before = sent.length;
						const openBefore = open.size;
						await page.waitForTimeout( 1000 );
						return 0 === openBefore && 0 === open.size && before === sent.length;
					},
					{ timeout: 20_000, intervals: [ 0 ] }
				)
				.toBe( true );
		},
	};
}

/**
 * The NIF the shopper's session holds, read through the Store API with the page's cookies, from
 * outside the page: a request made from inside it would go through WooCommerce's own request
 * handling and can change the checkout's state.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<string|null>}
 */
async function sessionNif( page ) {
	const response = await page.context().request.get( `${ nc.env.url }/wp-json/wc/store/v1/cart`, { ignoreHTTPSErrors: true } );
	const cart = await response.json();
	return cart.extensions[ 'ptwoo-nif' ].billingNif;
}

module.exports = {
	nc,
	NIF_INPUT,
	PLACE_ORDER,
	state,
	openCheckout,
	fillGuestDetails,
	placeOrder,
	waitForOrder,
	orderNif,
	isNifUpdate,
	isStoreUpdateUrl,
	watchNifUpdates,
	sessionNif,
};
