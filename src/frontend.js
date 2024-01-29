/**
 * External dependencies
 */
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';

/**
 * Internal dependencies
 */
import Block from './block';
import metadata from './block.json';

registerCheckoutBlock({
	metadata,
	component: Block,
});

document.addEventListener('DOMContentLoaded', () => {
	const checkoutBlock = document.querySelector(
		'.wp-block-woocommerce-checkout'
	);
	if (!checkoutBlock) {
		return;
	}

	const observer = new MutationObserver((mutationList, observer) => {
		for (const mutation of mutationList) {
			if (
				mutation.type === 'childList' &&
				mutation.addedNodes.length > 0
			) {
				const addedNodesArray = Array.from(mutation.addedNodes);
				let targetBlock = addedNodesArray.find(
					(node) =>
						node.classList &&
						node.classList.contains(
							'wp-block-woocommerce-checkout-shipping-methods-block'
						)
				);

				if (!targetBlock) {
					targetBlock = addedNodesArray.find(
						(node) =>
							node.classList &&
							node.classList.contains(
								'wp-block-woocommerce-checkout-payment-block'
							)
					);
				}

				if (targetBlock) {
					observer.disconnect();

					const nifBlock = document.querySelector(
						'.wp-block-woocommerce-ptwoo-nif'
					);
					if (nifBlock) {
						const position =
							targetBlock.compareDocumentPosition(nifBlock);
						if (position === Node.DOCUMENT_POSITION_FOLLOWING) {
							targetBlock.parentNode.insertBefore(
								nifBlock,
								targetBlock
							);
						}
					}
				}
			}
		}
	});

	const config = { childList: true, subtree: true };
	observer.observe(checkoutBlock, config);
});
