/**
 * External dependencies
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import metadata from './block.json';
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
		edit: Edit,
		save: Save,
	}
);
