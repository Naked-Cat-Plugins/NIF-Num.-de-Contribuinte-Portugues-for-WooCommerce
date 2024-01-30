/**
 * External dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import metadata from './block.json';
import { Icon } from './icon';
import attributes from './attributes';
import Edit from './edit';
import Save from './save';

registerBlockType(
	{
		...metadata,
		attributes: {
			...attributes,
		},
	},
	{
		icon: Icon,
		edit: Edit,
		save: Save,
	}
);
