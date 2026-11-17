/**
 * The NIF that reaches the order is the one in the field when Place Order is clicked, however slow
 * or out of order the field's cart updates are.
 *
 * Validation stays off (the plugin's default), as on the shop that reported the field going back
 * to a partial NIF while typing: with it on, a partial NIF is refused instead of saved.
 */

// @ts-check
const { test, expect } = require( '@playwright/test' );
const {
	nc,
	NIF_INPUT,
	PLACE_ORDER,
	openCheckout,
	fillGuestDetails,
	placeOrder,
	waitForOrder,
	orderNif,
	isNifUpdate,
	isStoreUpdateUrl,
	watchNifUpdates,
	sessionNif,
} = require( './support/checkout' );

const FULL_NIF = '123456789';
const sleep = ( ms ) => new Promise( ( resolve ) => setTimeout( resolve, ms ) );

/**
 * Type the first five digits, pause long enough for the debounced update to be sent, then type
 * the other four, as a shopper copying a NIF from a paper would.
 *
 * @param {import('@playwright/test').Page} page
 */
async function typeWithPause( page ) {
	const input = page.locator( NIF_INPUT );
	await input.click();
	await input.pressSequentially( FULL_NIF.slice( 0, 5 ), { delay: 30 } );
	await page.waitForTimeout( 700 );
	await input.pressSequentially( FULL_NIF.slice( 5 ), { delay: 30 } );
}

test.describe( 'NIF sync', () => {
	test( 'a slow answer to an earlier update does not put a partial NIF back in the field', async ( { page } ) => {
		await openCheckout( page );
		await fillGuestDetails( page );
		const updates = watchNifUpdates( page );

		// The shop is slow: the update sent after the first five digits is only answered once the
		// shopper has typed the rest, before the next update is sent (the reported case). It is
		// held in the browser and then let through, never fetched by the test itself: a response
		// fetched outside the page comes with a session cookie of its own.
		let releaseFirst = () => {};
		const typingDone = new Promise( ( resolve ) => ( releaseFirst = resolve ) );
		let first = true;
		await page.route( isStoreUpdateUrl, async ( route ) => {
			if ( first && isNifUpdate( route.request() ) ) {
				first = false;
				await Promise.race( [ typingDone, sleep( 10_000 ) ] );
			}
			await route.continue();
		} );

		const input = page.locator( NIF_INPUT );
		await input.click();
		await input.pressSequentially( FULL_NIF.slice( 0, 5 ), { delay: 30 } );
		await expect.poll( () => updates.sent.length, { timeout: 5_000 } ).toBe( 1 );
		await input.pressSequentially( FULL_NIF.slice( 5 ), { delay: 30 } );
		releaseFirst();
		await updates.settled();

		await expect( input ).toHaveValue( FULL_NIF );
		expect( updates.sent.at( -1 ) ).toBe( FULL_NIF );
		expect( await sessionNif( page ) ).toBe( FULL_NIF );
		expect( orderNif( await placeOrder( page ) ) ).toBe( FULL_NIF );
	} );

	test( 'an earlier update reaching the server late does not overwrite the full NIF', async ( { page } ) => {
		await openCheckout( page );
		await fillGuestDetails( page );
		const updates = watchNifUpdates( page );

		// The first update is held back until the next one has been answered (or three seconds,
		// when no other is sent meanwhile), so the server receives them in the wrong order.
		let first = true;
		let releaseFirst = () => {};
		const secondAnswered = new Promise( ( resolve ) => ( releaseFirst = resolve ) );
		page.on( 'requestfinished', ( request ) => {
			if ( ! first && isNifUpdate( request ) ) {
				releaseFirst();
			}
		} );
		await page.route( isStoreUpdateUrl, async ( route ) => {
			if ( first && isNifUpdate( route.request() ) ) {
				first = false;
				await Promise.race( [ secondAnswered, sleep( 3000 ) ] );
			}
			await route.continue();
		} );

		await typeWithPause( page );
		await updates.settled();

		await expect( page.locator( NIF_INPUT ) ).toHaveValue( FULL_NIF );
		expect( await sessionNif( page ) ).toBe( FULL_NIF );
		expect( orderNif( await placeOrder( page ) ) ).toBe( FULL_NIF );
	} );

	test( 'Place Order clicked straight after typing saves the NIF typed', async ( { page } ) => {
		await openCheckout( page );
		await fillGuestDetails( page );

		// No pause at all: the debounced update has not even been sent when the order is placed.
		await page.locator( NIF_INPUT ).fill( FULL_NIF );
		await page.locator( PLACE_ORDER ).click();

		expect( orderNif( await waitForOrder( page ) ) ).toBe( FULL_NIF );
	} );

	test( 'Place Order works again after an update fails', async ( { page } ) => {
		await openCheckout( page );
		await fillGuestDetails( page );

		let first = true;
		await page.route( isStoreUpdateUrl, async ( route ) => {
			if ( isNifUpdate( route.request() ) && first ) {
				first = false;
				await route.abort( 'failed' );
				return;
			}
			await route.continue();
		} );

		await page.locator( NIF_INPUT ).fill( FULL_NIF );
		await page.waitForTimeout( 2000 );

		await expect( page.locator( PLACE_ORDER ) ).not.toBeDisabled();
		expect( orderNif( await placeOrder( page ) ) ).toBe( FULL_NIF );
	} );
} );

test.describe( 'NIF sync, logged-in customer', () => {
	const SAVED_NIF = '501964843';
	let user;

	test.beforeAll( () => {
		user = nc.createUser( 'customer' );
		nc.wpEval( `
			$c = new WC_Customer( ${ user.id } );
			$c->set_billing_first_name( 'Teste' );
			$c->set_billing_last_name( 'NIF' );
			$c->set_billing_address_1( 'Rua de Teste 1' );
			$c->set_billing_city( 'Lisboa' );
			$c->set_billing_postcode( '1000-001' );
			$c->set_billing_country( 'PT' );
			$c->set_billing_email( '${ user.login }@example.com' );
			$c->set_billing_phone( '912345678' );
			$c->update_meta_data( 'billing_nif', '${ SAVED_NIF }' );
			$c->save();
		` );
	} );

	test.afterAll( () => {
		nc.emptyCart( user );
		nc.deleteUser( user );
	} );

	test( 'the saved NIF is filled in, and the one typed over it is saved', async ( { page } ) => {
		await nc.login( page, user );
		await openCheckout( page );
		await expect( page.locator( NIF_INPUT ) ).toHaveValue( SAVED_NIF );

		const updates = watchNifUpdates( page );
		await page.locator( NIF_INPUT ).fill( FULL_NIF );
		await updates.settled();
		await expect( page.locator( NIF_INPUT ) ).toHaveValue( FULL_NIF );

		const cod = page.locator( 'input[value="cod"]' );
		if ( await cod.count() ) {
			await cod.check();
		}
		expect( orderNif( await placeOrder( page ) ) ).toBe( FULL_NIF );
		expect( nc.wpEval( `echo get_user_meta( ${ user.id }, 'billing_nif', true );` ) ).toBe( FULL_NIF );
	} );
} );

