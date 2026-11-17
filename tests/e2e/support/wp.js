/**
 * The shared nakedcat-plugin-tests library and the paths the setup, teardown and specs share.
 * Run the specs through run-tests.sh --e2e, which sets the environment.
 */
const path = require( 'path' );

const nc = require(
	path.join(
		process.env.NAKEDCAT_TESTS_LIB || path.join( require( 'os' ).homedir(), '.claude/skills/nakedcat-plugin-tests' ),
		'js/helpers.js'
	)
);

module.exports = {
	nc,
	STATE: path.join( __dirname, '.e2e-state.json' ),
	MU_FILE: path.join( nc.env.wpPath || process.env.WP_ROOT || '', 'wp-content', 'mu-plugins', 'nif-tests-shop.php' ),
	// Every option the setup or a spec changes, put back by the teardown.
	SHOP_OPTIONS: [
		'woocommerce_checkout_page_id',
		'woocommerce_default_country',
		'woocommerce_default_customer_address',
		'woocommerce_cod_settings',
		'nakedcat_tests_nif_shop',
		'nakedcat_tests_nif_validate',
		'nakedcat_tests_nif_required',
	],
};
