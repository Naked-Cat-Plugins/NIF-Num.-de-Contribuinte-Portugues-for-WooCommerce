<?php
use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;

/**
 * Class for integrating with WooCommerce Blocks
 */
class NIF_Blocks_Integration implements IntegrationInterface {

	/**
	 * The name of the integration.
	 *
	 * @return string
	 */
	public function get_name() {
		return 'nif';
	}

	/**
	 * When called invokes any initialization/setup for the integration.
	 */
	public function initialize() {
		$this->register_block_frontend_scripts();
		$this->register_block_editor_scripts();
	}

	/**
	 * Returns an array of script handles to enqueue in the frontend context.
	 *
	 * @return string[]
	 */
	public function get_script_handles() {
		return array( 'nif-block-frontend' );
	}

	/**
	 * Returns an array of script handles to enqueue in the editor context.
	 *
	 * @return string[]
	 */
	public function get_editor_script_handles() {
		return array( 'nif-block-editor' );
	}

	/**
	 * An array of key, value pairs of data made available to the block on the client side.
	 *
	 * @return array
	 */
	public function get_script_data() {

		$data = array(
			'defaultLabel'      => woocommerce_nif_field_label(),
			'defaultIsRequired' => woocommerce_nif_field_required(),
			'defaultValidate'   => woocommerce_nif_field_validate(),
		);

		return $data;
	}

	/**
	 * Register block editor scripts.
	 *
	 * @return void
	 */
	public function register_block_editor_scripts() {
		$script_url        = WC_NIF_PLUGIN_URL . 'build/nif-block.js';
		$script_asset_path = WC_NIF_PLUGIN_DIR . 'build/nif-block.asset.php';
		$script_asset      = file_exists( $script_asset_path )
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version( $script_asset_path ),
			);

		wp_register_script(
			'nif-block-editor',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);

		wp_set_script_translations(
			'nif-block-editor',
			'nif',
			WC_NIF_PLUGIN_DIR . 'lang'
		);
	}

	/**
	 * Register block frontend scripts.
	 *
	 * @return void
	 */
	public function register_block_frontend_scripts() {
		$script_url        = WC_NIF_PLUGIN_URL . 'build/nif-block-frontend.js';
		$script_asset_path = WC_NIF_PLUGIN_DIR . 'build/nif-block-frontend.asset.php';
		$script_asset      = file_exists( $script_asset_path )
			? require $script_asset_path
			: array(
				'dependencies' => array(),
				'version'      => $this->get_file_version( $script_asset_path ),
			);

		wp_register_script(
			'nif-block-frontend',
			$script_url,
			$script_asset['dependencies'],
			$script_asset['version'],
			true
		);

		wp_set_script_translations(
			'nif-block-frontend',
			'nif',
			WC_NIF_PLUGIN_DIR . 'lang'
		);
	}

	/**
	 * Get the file modified time as a cache buster if we're in dev mode.
	 *
	 * @param string $file Local path to the file.
	 * @return string The cache buster value to use for the given file.
	 */
	protected function get_file_version( $file ) {
		if ( defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG && file_exists( $file ) ) {
			return filemtime( $file );
		}

		return WC_NIF_VERSION;
	}
}
