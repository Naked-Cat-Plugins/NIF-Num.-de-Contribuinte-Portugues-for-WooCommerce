/**
 * E2E tests for the NIF Português checkout block.
 *
 * Prerequisites:
 *   - WordPress with WooCommerce running at PLAYWRIGHT_BASE_URL (default https://wordpress.local)
 *   - At least one purchasable simple product; set its ID in TEST_PRODUCT_ID (default 1)
 *   - The WooCommerce Checkout Block on the /checkout page
 *   - A payment method enabled (e.g. Cash on Delivery)
 *   - The NIF block added inside the Checkout Block and configured with "Validate" on
 *
 * Run:
 *   npx playwright test
 *   npx playwright test --headed          (watch the browser)
 *   npx playwright test --ui              (Playwright UI mode)
 */

// @ts-check
const { test, expect } = require( '@playwright/test' );

const PRODUCT_ID  = process.env.TEST_PRODUCT_ID || '1';
const VALID_NIF   = '123456789'; // check digit = 9 — valid
const INVALID_NIF = '111111111'; // check digit should be 0 — invalid

// ─── Helpers ────────────────────────────────────────────────────────────────

async function addToCartAndGoToCheckout( page ) {
	await page.goto( `/?add-to-cart=${ PRODUCT_ID }&quantity=1` );
	await page.goto( '/checkout/' );
	await page.waitForSelector( '.wp-block-woocommerce-checkout', {
		timeout: 15_000,
	} );
}

async function setCountryPortugal( page ) {
	// WC Blocks renders the country as a ComboboxControl (<input> + dropdown).
	const countryInput = page.getByLabel( 'Country / Region' );
	await countryInput.clear();
	await countryInput.fill( 'Portugal' );
	await page.getByRole( 'option', { name: 'Portugal' } ).click();
	// NIF block becomes visible once the country is Portugal.
	await expect( page.locator( '#billing_nif' ) ).toBeVisible( {
		timeout: 5_000,
	} );
}

// Scoped selectors — keep tests independent of other blocks on the page.
const NIFBlock   = '.wp-block-woocommerce-ptwoo-nif';
const NIFInput   = '#billing_nif';
const NIFError   = `${ NIFBlock } .wc-block-components-validation-error`;
const PlaceOrder = '.wc-block-components-checkout-place-order-button';

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe( 'NIF block — Checkout Block', () => {
	test.beforeEach( async ( { page } ) => {
		await addToCartAndGoToCheckout( page );
	} );

	// ── Visibility ──────────────────────────────────────────────────────────

	test( 'field is visible when billing country is Portugal', async ( {
		page,
	} ) => {
		await setCountryPortugal( page );
		await expect( page.locator( NIFInput ) ).toBeVisible();
	} );

	// ── Blur-based error display (fix #2 + client-side validation fix #3) ──

	test( 'no error shown while the field is focused and value is invalid', async ( {
		page,
	} ) => {
		await setCountryPortugal( page );
		const input = page.locator( NIFInput );
		await input.focus();
		// Type an invalid NIF character by character — error must stay hidden
		// because the field is still focused.
		await input.pressSequentially( INVALID_NIF, { delay: 30 } );
		await expect( page.locator( NIFError ) ).not.toBeVisible();
	} );

	test( 'error appears after blur with an invalid NIF', async ( { page } ) => {
		await setCountryPortugal( page );
		const input = page.locator( NIFInput );
		await input.fill( INVALID_NIF );
		await input.blur();
		await expect( page.locator( NIFError ) ).toBeVisible();
	} );

	test( 'no error after blur with a valid NIF', async ( { page } ) => {
		await setCountryPortugal( page );
		const input = page.locator( NIFInput );
		await input.fill( VALID_NIF );
		await input.blur();
		await expect( page.locator( NIFError ) ).not.toBeVisible();
	} );

	test( 'error clears when user corrects an invalid NIF and blurs', async ( {
		page,
	} ) => {
		await setCountryPortugal( page );
		const input = page.locator( NIFInput );

		// Trigger error
		await input.fill( INVALID_NIF );
		await input.blur();
		await expect( page.locator( NIFError ) ).toBeVisible();

		// Fix it
		await input.fill( VALID_NIF );
		await input.blur();
		await expect( page.locator( NIFError ) ).not.toBeVisible();
	} );

	// ── Debounce (fix #1) ───────────────────────────────────────────────────

	test( 'only one Store API request is sent after typing stops', async ( {
		page,
	} ) => {
		await setCountryPortugal( page );

		const extensionRequests = [];
		page.on( 'request', ( req ) => {
			if (
				req.method() === 'POST' &&
				req.url().includes( '/wc/store/v1/cart/extensions' )
			) {
				extensionRequests.push( req );
			}
		} );

		// Type all 9 digits with 50 ms between each — well within the 300 ms
		// debounce window, so only one request should fire after typing stops.
		const input = page.locator( NIFInput );
		await input.pressSequentially( VALID_NIF, { delay: 50 } );

		// Wait for the debounce to flush (300 ms) + network round-trip buffer.
		await page.waitForTimeout( 800 );

		expect( extensionRequests ).toHaveLength( 1 );
	} );

	// ── Place Order button (fix #1 side-effect) ─────────────────────────────

	test( 'Place Order button is not disabled while typing', async ( {
		page,
	} ) => {
		await setCountryPortugal( page );

		const input = page.locator( NIFInput );
		await input.focus();
		// Type one character — with the debounce the button must never be
		// disabled mid-keystroke.
		await page.keyboard.type( '1' );
		await expect( page.locator( PlaceOrder ) ).not.toBeDisabled();
	} );
} );
