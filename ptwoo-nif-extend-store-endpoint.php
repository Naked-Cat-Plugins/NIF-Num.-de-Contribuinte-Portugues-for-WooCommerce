<?php
use Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema;

/**
 * Class for extending the WooCommerce Store API
 */
class PTWoo_NIF_Extend_Store_Endpoint {

	/**
	 * The name of the extension.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'ptwoo-nif';
	}

	/**
	 * When called invokes any initialization/setup for the extension.
	 */
	public function initialize() {
		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => CartSchema::IDENTIFIER,
				'namespace'       => $this->get_name(),
				'schema_callback' => array( $this, 'store_api_schema_callback' ),
				'data_callback'   => array( $this, 'store_api_data_callback' ),
				'schema_type'     => ARRAY_A,
			)
		);

		woocommerce_store_api_register_update_callback(
			array(
				'namespace' => $this->get_name(),
				'callback'  => array( $this, 'store_api_update_callback' ),
			)
		);

		add_action( 'woocommerce_store_api_checkout_update_order_meta', array( $this, 'checkout_update_order_meta' ) );
	}

	/**
	 * Add Store API schema data.
	 *
	 * @return array
	 */
	public function store_api_schema_callback() {
		return array(
			'billingNif' => array(
				'description' => __( 'NIF / NIPC', 'nif-num-de-contribuinte-portugues-for-woocommerce' ),
				'type'        => 'string',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'optional'    => ! woocommerce_nif_field_required(),
			),
		);
	}

	/**
	 * Add Store API endpoint data.
	 *
	 * @return array
	 */
	public function store_api_data_callback() {
		$billing_nif = wc()->session->get( 'billing_nif' );

		if ( empty( $billing_nif ) ) {
			$customer = wc()->customer;

			// Fallback to customer NIF (meta) if there's no NIF in session.
			if ( $customer instanceof \WC_Customer ) {
				$billing_nif = $customer->get_meta( 'billing_nif' );

				// Store NIF in session.
				wc()->session->set( 'billing_nif', $billing_nif );
			}
		}

		return array(
			'billingNif' => $billing_nif,
		);
	}

	/**
	 * Update callback to be executed by the Store API.
	 *
	 * @param  array $data Extension data.
	 * @return void
	 */
	public function store_api_update_callback( $data ) {

		$billing_nif = '';
		if ( ! empty( $data['billingNif'] ) ) {
			$billing_nif = sanitize_text_field( $data['billingNif'] );
		}

		// Store NIF in session.
		wc()->session->set( 'billing_nif', $billing_nif );
	}

	/**
	 * Update order meta.
	 *
	 * @param  \WC_Order $order The order object.
	 * @return void
	 */
	public function checkout_update_order_meta( $order ) {

		if ( ! $order instanceof \WC_Order ) {
			return;
		}

		if ( ! $order->has_status( 'checkout-draft' ) ) {
			return;
		}

		$billing_nif = wc()->session->get( 'billing_nif' );
		$billing_nif = sanitize_text_field( $billing_nif );

		// Store NIF in order meta.
		$order->update_meta_data( '_billing_nif', $billing_nif );

		// Store NIF in customer meta, if logged in.
		$customer_id = $order->get_customer_id();
		if ( ! empty( $customer_id ) ) {
			$customer = new \WC_Customer( $customer_id );
			$customer->update_meta_data( 'billing_nif', $billing_nif );
			$customer->save_meta_data();
		}

		$order->save();
	}
}
