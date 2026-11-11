
import PropTypes from 'prop-types'
import classNames from 'classnames'

import css from './Field.module.less'

/**
 * @param {Object} obj
 * @param {'text' | 'image' | 'input'} obj.type
 * @param {String} obj.title
 * @param {Object} obj.children
 * @param {'normal' | 'small' | 'large'} obj.size
 */
const Field = ({ type, title, children, size = 'normal', ...rest }) => {
    let className = classNames(rest.className || '', css.Field)
    className = classNames(className, {
        [css.textField]: type === 'text',
        [css.imageField]: type === 'image',
        [css.inputField]: type === 'input',
    })
    className = classNames(className, {
        [css.small]: size === 'small',
        [css.normal]: size === 'normal',
        [css.large]: size === 'large',
    })
    delete rest.className

    return (
        <div className={className} {...rest}>
            {title && <div className={css.title}>{title}</div>}
            <div className={css.value}>{children}</div>
        </div>
    )
}

Field.propTypes = {
    title: PropTypes.string,
    children: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.object),
        PropTypes.object,
        PropTypes.string,
        PropTypes.node,
    ]).isRequired,
    type: PropTypes.oneOf(['text', 'image', 'input']),
    size: PropTypes.oneOf(['normal', 'small', 'large']),
}

export default Field
