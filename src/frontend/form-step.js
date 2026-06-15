/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * Internal dependencies
 */
import FormStepHeading from './form-step-heading';

const FormStep = ({
	title = '',
	description = '',
	showStepNumber = true,
	className = '',
	children,
	stepHeadingContent = () => undefined,
}) => {
	/**
	 * If the form step doesn't have a legend or title, render a <div> instead of a <fieldset>.
	 */
	const Element = title ? 'fieldset' : 'div';

	return (
		<Element
			className={classnames(
				className,
				'wc-block-components-checkout-step',
				{
					'wc-block-components-checkout-step--with-step-number':
						showStepNumber,
				}
			)}
		>
			{title && <legend className="screen-reader-text">{title}</legend>}
			{(title || description) && (
				<div className="wc-block-components-checkout-step__heading-container">
					{title && (
						<FormStepHeading
							title={title}
							stepHeadingContent={stepHeadingContent()}
						/>
					)}
					{description && (
						<p className="wc-block-components-checkout-step__description">
							{description}
						</p>
					)}
				</div>
			)}
			<div className="wc-block-components-checkout-step__content">
				{children}
			</div>
		</Element>
	);
};

export default FormStep;
