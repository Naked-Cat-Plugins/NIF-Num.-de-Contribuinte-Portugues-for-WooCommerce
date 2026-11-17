<?php
/**
 * Plugin Name: NIF tests: plain shop
 * Description: Copied into mu-plugins by tests/e2e/support/global-setup.js and removed by the teardown. While the nakedcat_tests_nif_shop option holds a time in the future, front end requests load only WooCommerce and the NIF plugin, and the NIF field settings come from the nakedcat_tests_nif_validate and nakedcat_tests_nif_required options.
 *
 * @package Webdados\NIF
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Expires by itself, so a run that dies before its teardown leaves the shop alone within the hour.
if ( (int) get_option( 'nakedcat_tests_nif_shop', 0 ) > time() ) {

	// Front end only: WP-CLI, wp-admin, AJAX and cron see the real list, so nothing else using the
	// install (another session activating a plugin) reads the short one and saves it.
	if (
		! ( defined( 'WP_CLI' ) && WP_CLI )
		&& ! is_admin()
		&& ! wp_doing_ajax()
		&& ! wp_doing_cron()
	) {
		// And should a front end request try to save the list anyway, the short one is never saved.
		add_filter(
			'pre_update_option_active_plugins',
			function ( $value, $old_value ) {
				return $old_value;
			},
			PHP_INT_MAX,
			2
		);
		add_filter(
			'option_active_plugins',
			function ( $plugins ) {
				return array_values(
					array_intersect(
						(array) $plugins,
						array(
							'woocommerce/woocommerce.php',
							'nif-num-de-contribuinte-portugues-for-woocommerce/woocommerce_nif.php',
						)
					)
				);
			},
			PHP_INT_MAX
		);
	}

	// The field settings a spec asks for: "yes" or "no", the plugin's own default when not set.
	foreach (
		array(
			'woocommerce_nif_field_validate' => 'nakedcat_tests_nif_validate',
			'woocommerce_nif_field_required' => 'nakedcat_tests_nif_required',
		) as $nakedcat_tests_nif_filter => $nakedcat_tests_nif_option
	) {
		add_filter(
			$nakedcat_tests_nif_filter,
			function ( $value ) use ( $nakedcat_tests_nif_option ) {
				$set = get_option( $nakedcat_tests_nif_option, '' );
				return '' === $set ? $value : ( 'yes' === $set );
			},
			PHP_INT_MAX
		);
	}
}
