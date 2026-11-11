
import { forwardRef, useRef, useEffect } from 'react'
import Spotlight from '@enact/spotlight'
import { SpotlightContainerDecorator } from '@enact/spotlight/SpotlightContainerDecorator'
import FloatingLayer from '@enact/ui/FloatingLayer'
import PropTypes from 'prop-types'

import PillButton from './ui/PillButton'

import { $L } from '../hooks/language'
import css from './Alert.module.less'


/**
 * @param {Object} obj
 * @param {Boolean} obj.open
 * @param {String} obj.title
 * @param {String} obj.message
 * @param {Function} obj.onCancel
 * @param {Function} obj.onAccept
 * @param {Function} obj.forwardedRef
 */
export const AlertBase = ({ open, title, message, onCancel, onAccept, forwardedRef, ...rest }) => {
    /** @type {{current: HTMLElement}} */
    const compRef = useRef(null)

    useEffect(() => {
        const interlval = setInterval(() => {
            if (compRef.current) {
                clearInterval(interlval)
                Spotlight.focus(compRef.current.children[0])
            }
            return () => {
                clearInterval(interlval)
            }
        }, 100)
    }, [])

    return (
        <FloatingLayer className={css.Alert} open={open} noAutoDismiss>
            <div {...rest} className={css.content} ref={forwardedRef}>
                {title && <h2 className={css.title}>{title}</h2>}
                {message && <p className={css.message}>{message}</p>}
                <div className={css.buttons} ref={compRef}>
                    {onCancel &&
                        <PillButton className='spottable-default' onClick={onCancel}>
                            {$L('Cancel')}
                        </PillButton>
                    }
                    <PillButton className='spottable-default' onClick={onAccept}>
                        {$L('Accept')}
                    </PillButton>
                </div>
            </div>
        </FloatingLayer>
    )
}

export const AlertSpot = SpotlightContainerDecorator({
    enterTo: 'default-element',
    restrict: 'self-only',
    leaveFor: { left: '', right: '', up: '', down: '' },
}, AlertBase)

const Alert = forwardRef((props, ref) => (<AlertSpot {...props} forwardedRef={ref} />))

Alert.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.string,
    message: PropTypes.string,
    onCancel: PropTypes.func,
    onAccept: PropTypes.func.isRequired,
}

export default Alert
