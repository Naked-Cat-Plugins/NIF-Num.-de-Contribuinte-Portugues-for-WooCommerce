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
		add_action( 'woocommerce_store_api_checkout_order_processed', array( $this, 'maybe_clear_session_key' ) );
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
		$customer    = wc()->customer;
		$billing_nif = $this->get_session_billing_nif();
		$validate    = $this->get_session_validate();

		if ( null === $billing_nif ) {

			// Fallback to customer NIF (meta) if there's no NIF in session.
			if ( $customer instanceof \WC_Customer ) {
				$billing_nif = $customer->get_meta( 'billing_nif' );
			}
		}

		$data = array(
			'billingNif' => $billing_nif,
			'isValid'    => true,
		);

		$should_validate_nif = false;
		if ( ! empty( $validate ) && ! empty( $billing_nif ) ) {
			$show_all_countries = woocommerce_nif_show_all_countries();

			if ( ! empty( $show_all_countries ) ) {
				$should_validate_nif = true;
			} elseif ( $customer instanceof \WC_Customer && 'PT' === $customer->get_billing_country() ) {
				$should_validate_nif = true;
			}
		}

		if ( ! empty( $should_validate_nif ) ) {
			$is_valid = woocommerce_valida_nif( $billing_nif, true );

			$data['isValid'] = $is_valid;
		}

		return $data;
	}

	/**
	 * Update callback to be executed by the Store API.
	 *
	 * @param  array $data Extension data.
	 * @return void
	 */
	public function store_api_update_callback( $data ) {

		// Sets the WC customer session if one is not set.
		if ( ! ( isset( wc()->session ) && wc()->session->has_session() ) ) {
			wc()->session->set_customer_session_cookie( true );
		}

		wc()->session->set( $this->get_name(), $data );
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

		$billing_nif = $this->get_session_billing_nif();

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

	/**
	 * Retrieve the session billing NIF.
	 *
	 * @return string
	 */
	public function get_session_billing_nif() {

		$data = wc()->session->get( $this->get_name() );

		$billing_nif = null;
		if ( isset( $data['billingNif'] ) ) {
			$billing_nif = sanitize_text_field( $data['billingNif'] );
		}

		return $billing_nif;
	}

	/**
	 * Retrieve the session validation flag.
	 *
	 * @return string
	 */
	public function get_session_validate() {

		$data = wc()->session->get( $this->get_name() );

		$validate = false;
		if ( isset( $data['validate'] ) ) {
			$validate = boolval( $data['validate'] );
		}

		return $validate;
	}

	/**
	 * Clear the extension's session data, if set.
	 *
	 * @return void
	 */
	public function maybe_clear_session_key() {
		$session_data = wc()->session->get( $this->get_name() );

		if ( ! empty( $session_data ) ) {
			wc()->session->__unset( $this->get_name() );
		}
	}
}
