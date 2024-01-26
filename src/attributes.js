/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { getSetting } from '@woocommerce/settings';

const { defaultLabel, defaultIsRequired, defaultValidate, defaultMaxLength } =
	getSetting('ptwoo_nif_data', '');

export default {
	lock: {
		type: 'object',
		default: {
			move: false,
			remove: true,
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
		default: defaultLabel,
	},
	isRequired: {
		type: 'boolean',
		default: defaultIsRequired,
	},
	validate: {
		type: 'boolean',
		default: defaultValidate,
	},
	maxLength: {
		type: 'integer',
		default: defaultMaxLength,
	},
};
