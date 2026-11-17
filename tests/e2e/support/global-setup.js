/**
 * Get the install into a state the specs can check out from, and write down everything changed
 * so the teardown can put it back, even after a crash.
 *
 * What it sets up:
 * - the plain shop mu-plugin (only WooCommerce and this plugin on the front end);
 * - a virtual product, so no shipping method is needed;
 * - a checkout page of its own with the NIF block, which WooCommerce points at for the run;
 * - Portugal as the store country and the default customer location, so a guest's billing
 *   country is Portugal and the NIF field is shown;
 * - cash on delivery, so an order can be placed.
 */
const fs = require( 'fs' );
const path = require( 'path' );
const { nc, STATE, MU_FILE, SHOP_OPTIONS } = require( './wp' );

const MU_SOURCE = path.join( __dirname, 'nif-tests-shop.php' );
const PAGE_SLUG = 'nakedcat-tests-nif-checkout';
const NIF_BLOCK =
	'<!-- wp:woocommerce/ptwoo-nif --><div class="wp-block-woocommerce-ptwoo-nif"></div><!-- /wp:woocommerce/ptwoo-nif -->';

module.exports = async () => {
	// Never on top of another run (or one that crashed): its state file would be overwritten and
	// the original checkout page lost.
	const inFlight = nc.wpEval(
		`$p = get_post( (int) get_option( 'woocommerce_checkout_page_id' ) ); echo $p && '${ PAGE_SLUG }' === $p->post_name ? 'yes' : 'no';`
	);
	if ( fs.existsSync( STATE ) || 'yes' === inFlight ) {
		throw new Error(
			'NIF e2e: another run is in flight or crashed without tearing down.\n' +
				'Let it finish, or restore woocommerce_checkout_page_id by hand and delete\n' +
				STATE +
				' before trying again.'
		);
	}

	const state = {
		// Every option changed below, as JSON: null for one that did not exist.
		options: JSON.parse(
			nc.wpEval(
				`$out = array(); foreach ( json_decode( '${ JSON.stringify( SHOP_OPTIONS ) }', true ) as $name ) { $out[ $name ] = get_option( $name, null ); } echo wp_json_encode( $out );`
			)
		),
		productId: null,
		pageId: null,
		orders: [],
	};
	fs.writeFileSync( STATE, JSON.stringify( state, null, '\t' ) );

	fs.mkdirSync( path.dirname( MU_FILE ), { recursive: true } );
	fs.copyFileSync( MU_SOURCE, MU_FILE );

	state.productId = Number(
		nc.wpEval(
			`$p = new WC_Product_Simple(); $p->set_name( 'nakedcat test product' ); $p->set_status( 'publish' ); $p->set_virtual( true ); $p->set_regular_price( '10' ); echo $p->save();`
		)
	);
	fs.writeFileSync( STATE, JSON.stringify( state, null, '\t' ) );

	// WooCommerce's own checkout page markup, with the NIF block before the payment methods.
	const content = nc
		.wcBlockPageContent( 'checkout' )
		.replace( '<!-- wp:woocommerce/checkout-payment-block', NIF_BLOCK + '<!-- wp:woocommerce/checkout-payment-block' );
	if ( ! content.includes( NIF_BLOCK ) ) {
		throw new Error( 'NIF e2e: no payment block in WooCommerce\'s checkout page markup to place the NIF block before.' );
	}
	state.pageId = Number(
		nc.wpEval( `
			$existing = get_page_by_path( '${ PAGE_SLUG }' );
			$id = wp_insert_post( wp_slash( array(
				'ID'           => $existing ? $existing->ID : 0,
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_name'    => '${ PAGE_SLUG }',
				'post_title'   => '${ PAGE_SLUG }',
				'post_content' => base64_decode( '${ Buffer.from( content ).toString( 'base64' ) }' ),
			) ) );
			echo (int) $id;
		` )
	);
	fs.writeFileSync( STATE, JSON.stringify( state, null, '\t' ) );

	nc.wpEval( `
		update_option( 'nakedcat_tests_nif_shop', time() + HOUR_IN_SECONDS );
		update_option( 'woocommerce_checkout_page_id', ${ state.pageId } );
		update_option( 'woocommerce_default_country', 'PT' );
		update_option( 'woocommerce_default_customer_address', 'base' );
		$cod = (array) get_option( 'woocommerce_cod_settings', array() );
		$cod['enabled'] = 'yes';
		$cod['enable_for_virtual'] = 'yes';
		$cod['enable_for_methods'] = array();
		update_option( 'woocommerce_cod_settings', $cod );
		delete_option( 'nakedcat_tests_nif_validate' );
		delete_option( 'nakedcat_tests_nif_required' );
	` );

	// eslint-disable-next-line no-console
	console.log( `  NIF e2e: checkout page ${ state.pageId }, product ${ state.productId }` );
};
