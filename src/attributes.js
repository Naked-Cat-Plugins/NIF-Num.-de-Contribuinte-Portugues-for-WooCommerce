/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

export default {
	lock: {
		type: 'object',
		default: {
			move: true,
			remove: false,
		},
	},
	className: {
		type: 'string',
		default: '',
	},
	stepTitle: {
		type: 'string',
		default: __(
			'Fiscal information',
			'nif-num-de-contribuinte-portugues-for-woocommerce'
		),
	},
	stepDescription: {
		type: 'string',
		default: '',
	},
	showStepNumber: {
		type: 'boolean',
		default: true,
	},
	label: {
		type: 'string',
		default: __(
			'NIF / NIPC',
			'nif-num-de-contribuinte-portugues-for-woocommerce'
		),
	},
	isRequired: {
		type: 'boolean',
		default: false,
	},
	validate: {
		type: 'boolean',
		default: false,
	},
};
