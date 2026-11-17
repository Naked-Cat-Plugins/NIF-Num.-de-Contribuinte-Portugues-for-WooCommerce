// Run through ~/.claude/skills/nakedcat-plugin-tests/bin/run-tests.sh <plugin dir> --e2e
const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	timeout: 90_000,
	retries: 0,
	// One worker: the specs share one shop, and the field settings some of them change.
	workers: 1,
	globalSetup: require.resolve( './tests/e2e/support/global-setup.js' ),
	globalTeardown: require.resolve( './tests/e2e/support/global-teardown.js' ),
	reporter: [ [ 'list' ] ],
	use: {
		baseURL: process.env.WP_BASE_URL,
		// WordPress 7.2 animates admin page changes, which can stall clicks waiting for "stable".
		contextOptions: { reducedMotion: 'reduce' },
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
} );
