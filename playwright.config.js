const { defineConfig } = require( '@playwright/test' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	timeout: 30_000,
	retries: process.env.CI ? 2 : 0,
	reporter: [ [ 'html', { open: 'never' } ], [ 'list' ] ],
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://wordpress.local',
		ignoreHTTPSErrors: true,
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
} );
