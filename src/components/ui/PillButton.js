import Spottable from '@enact/spotlight/Spottable'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Icon from './Icons'
import css from './PillButton.module.less'


const SpottableDiv = Spottable('div')

/**
 * Rounded button: translucent at rest, white when focused (tvOS style)
 * @param {Object} obj
 * @param {String} [obj.icon] glyph name from ./Icons
 * @param {Boolean} [obj.round] icon only, a circle
 * @param {Boolean} [obj.small] shorter, for tabs and secondary actions
 * @param {Boolean} [obj.selected] the current tab
 * @param {Boolean} [obj.plain] no background at rest
 */
const PillButton = ({ icon, round, small, selected, plain, className, children, ...rest }) => (
    <SpottableDiv
        className={classNames('cr-own', css.pill, {
            [css.round]: round,
            [css.small]: small,
            [css.selected]: selected,
            [css.plain]: plain,
            [css.disabled]: rest.disabled,
        }, className)}
        role='button'
        {...rest}>
        {icon && <Icon name={icon} className={css.icon} />}
        {children != null && children !== false && <span className={css.label}>{children}</span>}
    </SpottableDiv>
)

PillButton.propTypes = {
    icon: PropTypes.string,
    round: PropTypes.bool,
    small: PropTypes.bool,
    selected: PropTypes.bool,
    plain: PropTypes.bool,
    disabled: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
}

export default PillButton
