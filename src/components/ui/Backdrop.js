import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import css from './Backdrop.module.less'


/**
 * Full-screen artwork behind a page. Two permanent <img> layers take turns: the new picture is decoded off-screen
 * first and then fades in over the old one, which only hides once the fade is over (no layer is created or dropped,
 * and the background never flashes through). The images are composited as they are (16:9 artwork on a 16:9 screen,
 * no clip), so a swap uploads one picture and rasterises nothing; the page's fades are one static layer on top,
 * painted once.
 * @param {Object} obj
 * @param {String} [obj.src] picture to show
 * @param {'home'|'detail'|'dim'} [obj.variant] which fades to paint over it
 * @param {Number} [obj.delay] wait this long for `src` to settle before loading it
 */
const Backdrop = ({ src, variant = 'home', delay = 0, className }) => {
    /** @type {[{srcs: Array<String>, front: Number, settled: Boolean}, Function]} */
    const [state, setState] = useState({ srcs: [null, null], front: 0, settled: true })
    /** @type {{current: String}} */
    const wantedRef = useRef(null)

    useEffect(() => {
        wantedRef.current = src
        let cancelled = false
        let settleTimer = null
        const show = () => {
            if (cancelled || wantedRef.current !== src) {
                return
            }
            setState(prev => {
                if (prev.srcs[prev.front] === src) {
                    return prev
                }
                const front = prev.front === 0 ? 1 : 0
                const srcs = prev.srcs.slice()
                srcs[front] = src
                return { srcs, front, settled: false }
            })
            settleTimer = setTimeout(() => setState(prev => ({ ...prev, settled: true })), 500)
        }
        const load = () => {
            if (!src) {
                return
            }
            const img = new window.Image()
            img.src = src
            if (img.decode) {
                img.decode().then(show, show)
            } else {
                img.onload = show
                img.onerror = show
            }
        }
        const timer = setTimeout(load, delay)
        return () => {
            cancelled = true
            clearTimeout(timer)
            clearTimeout(settleTimer)
        }
    }, [src, delay])

    return (
        <div className={classNames(css.backdrop, css[variant], className)}>
            {state.srcs.map((layerSrc, index) => {
                const isFront = index === state.front
                return (
                    <img key={index}
                        alt=''
                        src={layerSrc || undefined}
                        className={classNames(css.layer, {
                            [css.on]: isFront && !!layerSrc,
                            [css.under]: !isFront && !state.settled && !!layerSrc,
                        })} />
                )
            })}
            <div className={css.shade} />
        </div>
    )
}

Backdrop.propTypes = {
    src: PropTypes.string,
    variant: PropTypes.oneOf(['home', 'detail', 'dim']),
    delay: PropTypes.number,
    className: PropTypes.string,
}

export default Backdrop
