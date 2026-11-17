<?php
/**
 * The Checkout block's NIF on the server: the session, the Place Order request and the order.
 *
 * @package Webdados\NIF
 */

use Automattic\WooCommerce\StoreApi\Exceptions\RouteException;
use Automattic\WooCommerce\StoreApi\SchemaController;
use Automattic\WooCommerce\StoreApi\StoreApi;

/**
 * PTWoo_NIF_Extend_Store_Endpoint.
 */
class StoreEndpointTest extends NakedCat_Tests_TestCase {

	const FULL_NIF    = '123456789';
	const INVALID_NIF = '111111111';

	/**
	 * The class under test.
	 *
	 * @var PTWoo_NIF_Extend_Store_Endpoint
	 */
	private $endpoint;

	/**
	 * A WooCommerce session and customer of the test's own, as on a Store API request.
	 */
	protected function setUp(): void {
		parent::setUp();
		$session  = WC()->session;
		$customer = WC()->customer;
		$this->on_teardown(
			function () use ( $session, $customer ) {
				WC()->session  = $session;
				WC()->customer = $customer;
			}
		);
		WC()->session = new WC_Session_Handler();
		WC()->session->init();
		WC()->customer = new WC_Customer( 0, true );
		WC()->customer->set_billing_country( 'PT' );
		$this->endpoint = new PTWoo_NIF_Extend_Store_Endpoint();
	}

	/**
	 * A checkout request carrying what the field sends with Place Order.
	 *
	 * @param array|null $nif_data The field's data, null for a request without it.
	 * @return WP_REST_Request
	 */
	private function checkout_request( $nif_data ) {
		$request = new WP_REST_Request( 'POST', '/wc/store/v1/checkout' );
		$request->set_param( 'extensions', null === $nif_data ? array() : array( 'ptwoo-nif' => $nif_data ) );
		return $request;
	}

	/**
	 * Place Order: the request's data, then the order processed, in the order the Store API runs
	 * them, on this test's own instance.
	 *
	 * @param WC_Order        $order          Order.
	 * @param WP_REST_Request $request        Checkout request.
	 * @param callable|null   $in_between     Run between the two, as WooCommerce's own steps are.
	 */
	private function place_order( $order, $request, $in_between = null ) {
		$this->endpoint->update_from_checkout_request( $order, $request );
		if ( $in_between ) {
			$in_between();
		}
		$this->endpoint->process_order( $order );
	}

	/**
	 * The plugin is hooked into both Store API steps.
	 */
	public function test_hooked_in() {
		$this->assertNotFalse( has_action( 'woocommerce_store_api_checkout_update_order_from_request' ) );
		$this->assertNotFalse( has_action( 'woocommerce_store_api_checkout_order_processed' ) );
	}

	/**
	 * The NIF sent with Place Order survives the session losing values written during the
	 * request, as it does on a real Place Order request before the order is processed.
	 */
	public function test_place_order_nif_survives_session_reload() {
		$order = wc_get_order( $this->make_order() );

		$this->place_order(
			$order,
			$this->checkout_request( array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => false ) ),
			function () {
				WC()->session->__unset( 'ptwoo-nif' );
			}
		);

		$this->assertSame( self::FULL_NIF, wc_get_order( $order->get_id() )->get_meta( '_billing_nif' ) );
	}

	/**
	 * The NIF sent with Place Order wins over an older one in the session: a cart update with
	 * part of the NIF may be the last one the server received.
	 */
	public function test_place_order_nif_wins_over_session() {
		WC()->session->set( 'ptwoo-nif', array( 'billingNif' => '12345', 'isRequired' => false, 'validate' => false ) );
		$order = wc_get_order( $this->make_order() );

		$this->place_order( $order, $this->checkout_request( array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => false ) ) );

		$this->assertSame( self::FULL_NIF, wc_get_order( $order->get_id() )->get_meta( '_billing_nif' ) );
	}

	/**
	 * Place Order with nothing in the session yet (clicked before the first cart update was sent).
	 */
	public function test_place_order_nif_without_session() {
		$order = wc_get_order( $this->make_order() );

		$this->place_order( $order, $this->checkout_request( array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => false ) ) );

		$this->assertSame( self::FULL_NIF, wc_get_order( $order->get_id() )->get_meta( '_billing_nif' ) );
	}

	/**
	 * A request without the field's data (a page still running the previous script) keeps the
	 * session's NIF, as before.
	 */
	public function test_request_without_nif_keeps_session() {
		WC()->session->set( 'ptwoo-nif', array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => false ) );
		$order = wc_get_order( $this->make_order() );

		$this->place_order( $order, $this->checkout_request( null ) );
		$this->assertSame( self::FULL_NIF, wc_get_order( $order->get_id() )->get_meta( '_billing_nif' ) );
	}

	/**
	 * Same, when the request has the namespace with nulls, which is what WooCommerce's sanitizing
	 * of the registered schema gives a request without our data.
	 */
	public function test_request_with_nulls_keeps_session() {
		WC()->session->set( 'ptwoo-nif', array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => false ) );
		$order = wc_get_order( $this->make_order() );

		$this->place_order( $order, $this->checkout_request( array( 'billingNif' => null, 'isRequired' => null, 'validate' => null ) ) );
		$this->assertSame( self::FULL_NIF, wc_get_order( $order->get_id() )->get_meta( '_billing_nif' ) );
	}

	/**
	 * An emptied field empties the NIF, even with an older one in the session.
	 */
	public function test_place_order_empty_nif_wins_over_session() {
		WC()->session->set( 'ptwoo-nif', array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => false ) );
		$order = wc_get_order( $this->make_order() );

		$this->place_order( $order, $this->checkout_request( array( 'billingNif' => '', 'isRequired' => false, 'validate' => false ) ) );
		$this->assertSame( '', wc_get_order( $order->get_id() )->get_meta( '_billing_nif' ) );
	}

	/**
	 * With validation on, an invalid NIF sent with Place Order is refused, even when the session
	 * holds a valid one.
	 */
	public function test_invalid_place_order_nif_refused() {
		WC()->session->set( 'ptwoo-nif', array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => true ) );
		$order = wc_get_order( $this->make_order() );

		$this->expectException( RouteException::class );
		$this->place_order( $order, $this->checkout_request( array( 'billingNif' => self::INVALID_NIF, 'isRequired' => false, 'validate' => true ) ) );
	}

	/**
	 * The schema registered for the checkout endpoint: WooCommerce keeps the field's data through
	 * its sanitizing, and gives nulls for a request without it.
	 */
	public function test_checkout_schema_sanitizing() {
		$schema     = StoreApi::container()->get( SchemaController::class )->get( 'checkout' );
		$properties = (array) $schema->get_item_schema()['properties'];
		$extensions = (array) $properties['extensions'];
		$sanitize   = $extensions['arg_options']['sanitize_callback'];
		$validate   = $extensions['arg_options']['validate_callback'];
		$request    = new WP_REST_Request( 'POST', '/wc/store/v1/checkout' );

		$sent = array( 'ptwoo-nif' => array( 'billingNif' => self::FULL_NIF, 'isRequired' => false, 'validate' => true ) );
		$this->assertTrue( $validate( $sent, $request, 'extensions' ) );
		$this->assertSame( $sent['ptwoo-nif'], $sanitize( $sent, $request, 'extensions' )['ptwoo-nif'] );

		$this->assertTrue( $validate( array(), $request, 'extensions' ) );
		$this->assertNull( $sanitize( array(), $request, 'extensions' )['ptwoo-nif']['billingNif'] ?? null );
	}
}
