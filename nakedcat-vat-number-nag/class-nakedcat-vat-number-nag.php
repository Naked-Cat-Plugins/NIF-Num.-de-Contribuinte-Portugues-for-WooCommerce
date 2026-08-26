<?php
/**
 * Class Nag
 *
 * @version 1.0
 * @package NIF_WooCommerce
 */

namespace NakedCatPlugins\NIF\VAT_Number_Nag;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

/**
 * The admin notice introducing VAT Number and EU VIES Validation for WooCommerce.
 *
 * @package NakedCatPlugins\NIF\VAT_Number_Nag
 */
class Nag {

	/**
	 * Identifier used for the notice element, the AJAX action and the nonce.
	 */
	const NOTICE_ID = 'nakedcat_vat_number_nag';

	/**
	 * Product page the notice links to, before the campaign parameters.
	 */
	const PRODUCT_URL = 'https://nakedcatplugins.com/product/vat-number-and-eu-vies-validation-for-woocommerce/';

	/**
	 * Campaign this plugin is credited with in the product page URL.
	 */
	const UTM_CAMPAIGN = 'nifportugues_woocommerce_plugin';

	/**
	 * Coupon offered to the shops running this plugin.
	 */
	const COUPON = 'niftovat';

	/**
	 * When the launch offer ends, in ISO 8601 with the Lisbon offset.
	 *
	 * Never shown: the deadline belongs on the product page, where it can be changed
	 * without a plugin release. It is only used to stop showing the notice, so an
	 * installation left unattended past the offer does not keep advertising it.
	 */
	const OFFER_ENDS = '2026-09-30T23:59:59+01:00';

	/**
	 * How many customers the coupon is limited to. Stated in the copy so nobody counts on
	 * it still being available.
	 */
	const COUPON_LIMIT = 50;

	/**
	 * `user_meta` key holding the timestamp until which this user dismissed the notice.
	 */
	const DISMISSED_USER_META = 'nakedcat_vat_number_nag_dismissed_until';

	/**
	 * How long a dismissal is remembered, in days.
	 */
	const DISMISS_DAYS = 120;

	/**
	 * Screens the notice is allowed on.
	 *
	 * Deliberately not every admin page: this is a promotion, and it has no business
	 * interrupting an unrelated plugin's screen.
	 *
	 * @var array
	 */
	private $screens = array(
		'dashboard',
		'plugins',
		'woocommerce_page_wc-settings',
		'woocommerce_page_wc-orders',
		'edit-shop_order',
	);

	/**
	 * Register the hooks.
	 */
	public function init() {
		add_action( 'admin_notices', array( $this, 'render' ) );
		add_action( 'wp_ajax_' . self::NOTICE_ID . '_dismiss', array( $this, 'ajax_dismiss' ) );
	}

	/**
	 * Whether the notice should be rendered for the current user, on the current screen.
	 *
	 * @return bool
	 */
	private function should_show(): bool {

		// Already using the plugin being promoted.
		if ( class_exists( 'NakedCat_VAT_Number' ) ) {
			return false;
		}

		// Nothing left to promote.
		if ( $this->offer_is_over() ) {
			return false;
		}

		// Only the people who could act on it.
		if ( ! current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown
			return false;
		}

		if ( ! $this->on_allowed_screen() ) {
			return false;
		}

		return intval( get_user_meta( get_current_user_id(), self::DISMISSED_USER_META, true ) ) < time();
	}

	/**
	 * Whether the launch offer has ended.
	 *
	 * @return bool
	 */
	private function offer_is_over(): bool {
		$ends = strtotime( self::OFFER_ENDS );
		return $ends ? ( time() > $ends ) : false;
	}

	/**
	 * Whether the current screen is one of the allowed ones.
	 *
	 * @return bool
	 */
	private function on_allowed_screen(): bool {

		if ( ! function_exists( 'get_current_screen' ) ) {
			return false;
		}

		$screen = get_current_screen();

		return ( $screen && in_array( $screen->id, $this->screens, true ) );
	}

	/**
	 * Render the notice.
	 */
	public function render() {

		if ( ! $this->should_show() ) {
			return;
		}

		$link_open  = sprintf( '<a href="%s" target="_blank">', esc_url( $this->product_url() ) );
		$link_close = '</a>';
		$allowed    = array(
			'strong' => array(),
			'a'      => array(
				'href'   => array(),
				'target' => array(),
			),
		);
		?>
		<div id="<?php echo esc_attr( self::NOTICE_ID ); ?>" class="notice notice-info is-dismissible">
			<p style="line-height: 1.5em;">
				<img src="<?php echo esc_url( plugin_dir_url( __FILE__ ) . 'icon-vat-number.svg' ); ?>" alt="" style="float: left; width: 80px; height: auto; margin: 0 1em 0.5em 0;"/>
				<strong><?php esc_html_e( 'Do you also sell to businesses in other European Union countries?', 'nif-num-de-contribuinte-portugues-for-woocommerce' ); ?></strong>
				<br/>
				<?php
				echo wp_kses(
					sprintf(
						/* translators: %1$s: link opening tag, %2$s: link closing tag */
						__( 'Get to know %1$sVAT Number and EU VIES Validation for WooCommerce%2$s, our premium plugin for the whole European Union. It collects the customer VAT identification number, pre-validates it on your own server, confirms it against VIES and removes VAT on qualifying intra-EU B2B orders.', 'nif-num-de-contribuinte-portugues-for-woocommerce' ),
						$link_open,
						$link_close
					),
					$allowed
				);
				?>
				<br/>
				<?php
				echo wp_kses(
					__( 'It replaces this plugin rather than extending it, and its <strong>Zero-Touch Migration</strong> reads the numbers already stored here, so there is nothing to export, import or schedule.', 'nif-num-de-contribuinte-portugues-for-woocommerce' ),
					$allowed
				);
				?>
				<br/>
				<?php
				echo wp_kses(
					sprintf(
						/* translators: %1$s: link opening tag, %2$s: link closing tag */
						__( '%1$sLaunch offer%2$s: 50%% off the first year, or 25%% off a lifetime licence.', 'nif-num-de-contribuinte-portugues-for-woocommerce' ),
						'<strong>' . $link_open,
						$link_close . '</strong>'
					),
					$allowed
				);
				?>
				<br/>
				<?php
				echo wp_kses(
					sprintf(
						/* translators: %1$s: coupon code, %2$d: how many customers the coupon is limited to */
						__( 'And because you use this plugin, add the coupon %1$s to a yearly licence for an extra 50%% off the first year <strong>and</strong> 50%% off every renewal, for as long as it is renewed, which the launch discount on its own does not include. Limited to the first %2$d customers.', 'nif-num-de-contribuinte-portugues-for-woocommerce' ),
						'<strong>' . esc_html( self::COUPON ) . '</strong>',
						intval( self::COUPON_LIMIT )
					),
					$allowed
				);
				?>
			</p>
		</div>
		<script type="text/javascript">
		( function () {
			var notice = document.getElementById( '<?php echo esc_js( self::NOTICE_ID ); ?>' );
			if ( ! notice ) {
				return;
			}
			notice.addEventListener( 'click', function ( event ) {
				if ( ! event.target.classList.contains( 'notice-dismiss' ) ) {
					return;
				}
				var data = new FormData();
				data.append( 'action', '<?php echo esc_js( self::NOTICE_ID ); ?>_dismiss' );
				data.append( 'nonce', '<?php echo esc_js( wp_create_nonce( self::NOTICE_ID ) ); ?>' );
				window.fetch( ajaxurl, {
					method: 'POST',
					credentials: 'same-origin',
					body: data
				} );
			} );
		} )();
		</script>
		<?php
	}

	/**
	 * The product page URL, with the campaign parameters.
	 *
	 * The source is this shop own host name rather than a fixed string, so the product
	 * page analytics show which shops the visits came from.
	 *
	 * @return string
	 */
	private function product_url(): string {

		$host = wp_parse_url( home_url(), PHP_URL_HOST );

		return add_query_arg(
			array(
				'utm_source'   => rawurlencode( $host ? $host : 'unknown' ),
				'utm_medium'   => 'link',
				'utm_campaign' => self::UTM_CAMPAIGN,
			),
			self::PRODUCT_URL
		);
	}

	/**
	 * Remember this user dismissed the notice.
	 */
	public function ajax_dismiss() {
		check_ajax_referer( self::NOTICE_ID, 'nonce' );
		update_user_meta(
			get_current_user_id(),
			self::DISMISSED_USER_META,
			time() + ( self::DISMISS_DAYS * DAY_IN_SECONDS )
		);
		wp_die();
	}
}
