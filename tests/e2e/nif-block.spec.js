/**
 * The NIF block on the Checkout block: visibility, validation messages, and how often it talks to
 * the server while the shopper types.
 *
 * Run through ~/.claude/skills/nakedcat-plugin-tests/bin/run-tests.sh <plugin dir> --e2e, which
 * sets up the install; tests/e2e/support/global-setup.js builds the shop these run against.
 */

// @ts-check
const { test, expect } = require( '@playwright/test' );
const { nc, NIF_INPUT, PLACE_ORDER, openCheckout, watchNifUpdates } = require( './support/checkout' );

const VALID_NIF = '123456789';
const INVALID_NIF = '111111111';
const NIF_ERROR = '.wp-block-woocommerce-ptwoo-nif .wc-block-components-validation-error';

test.describe( 'NIF block', () => {
	test( 'the field is shown when the billing country is Portugal', async ( { page } ) => {
		await openCheckout( page );
		await expect( page.locator( NIF_INPUT ) ).toBeVisible();
	} );

	test( 'one cart update is sent after the shopper stops typing', async ( { page } ) => {
		await openCheckout( page );
		const updates = watchNifUpdates( page );

		// 50 ms between keys, well inside the 300 ms debounce.
		await page.locator( NIF_INPUT ).pressSequentially( VALID_NIF, { delay: 50 } );
		await updates.settled();

		expect( updates.sent ).toEqual( [ VALID_NIF ] );
	} );

	test( 'Place Order is not disabled while typing', async ( { page } ) => {
		await openCheckout( page );
		await page.locator( NIF_INPUT ).focus();
		await page.keyboard.type( '1' );
		await expect( page.locator( PLACE_ORDER ) ).not.toBeDisabled();
	} );
} );

test.describe( 'NIF block with validation on', () => {
	let undo;

	test.beforeAll( () => {
		undo = nc.setOption( 'nakedcat_tests_nif_validate', 'yes' );
	} );

	test.afterAll( () => {
		undo();
	} );

	test( 'no error while the field is focused, even with an invalid NIF', async ( { page } ) => {
		await openCheckout( page );
		const input = page.locator( NIF_INPUT );
		await input.focus();
		await input.pressSequentially( INVALID_NIF, { delay: 30 } );
		await expect( page.locator( NIF_ERROR ) ).not.toBeVisible();
	} );

	test( 'the error appears after leaving the field with an invalid NIF', async ( { page } ) => {
		await openCheckout( page );
		const input = page.locator( NIF_INPUT );
		await input.fill( INVALID_NIF );
		await input.blur();
		await expect( page.locator( NIF_ERROR ) ).toBeVisible();
	} );

	test( 'no error after leaving the field with a valid NIF', async ( { page } ) => {
		await openCheckout( page );
		const input = page.locator( NIF_INPUT );
		await input.fill( VALID_NIF );
		await input.blur();
		await expect( page.locator( NIF_ERROR ) ).not.toBeVisible();
	} );

	test( 'the error goes away once the NIF is corrected', async ( { page } ) => {
		await openCheckout( page );
		const input = page.locator( NIF_INPUT );
		await input.fill( INVALID_NIF );
		await input.blur();
		await expect( page.locator( NIF_ERROR ) ).toBeVisible();
		await input.fill( VALID_NIF );
		await input.blur();
		await expect( page.locator( NIF_ERROR ) ).not.toBeVisible();
	} );
} );
