/**
 * Put back everything global-setup.js changed, from its state file, and remove what the specs
 * created (orders are recorded in the state file by checkout.js as they are placed).
 */
const fs = require( 'fs' );
const { nc, STATE, MU_FILE } = require( './wp' );

module.exports = async () => {
	if ( ! fs.existsSync( STATE ) ) {
		return;
	}
	const state = JSON.parse( fs.readFileSync( STATE, 'utf8' ) );
	const encoded = Buffer.from( JSON.stringify( state ) ).toString( 'base64' );

	nc.wpEval( `
		$state = json_decode( base64_decode( '${ encoded }' ), true );
		foreach ( $state['options'] as $name => $value ) {
			if ( null === $value ) {
				delete_option( $name );
			} else {
				update_option( $name, $value );
			}
		}
		foreach ( (array) $state['orders'] as $id ) {
			$order = wc_get_order( (int) $id );
			if ( $order ) {
				$order->delete( true );
			}
		}
		if ( $state['productId'] ) {
			$product = wc_get_product( (int) $state['productId'] );
			if ( $product ) {
				$product->delete( true );
			}
		}
		if ( $state['pageId'] ) {
			wp_delete_post( (int) $state['pageId'], true );
		}
	` );

	if ( fs.existsSync( MU_FILE ) ) {
		fs.unlinkSync( MU_FILE );
	}
	fs.unlinkSync( STATE );
};
