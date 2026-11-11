import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import { isReady, markReady } from './preload'
import { getStoredImage } from '../../hooks/imageStore'
import css from './Backdrop.module.less'

/** a preview waits this long: when the big picture comes from the TV's own store, it's there first and no blur shows */
const PREVIEW_GRACE_MS = 150


/**
 * Full-screen artwork behind a page. Two permanent <img> layers take turns: the new picture is decoded off-screen
 * first and then fades in over the old one, which only hides once the fade is over (no layer is created or dropped,
 * and the background never flashes through). The images are composited as they are (16:9 artwork on a 16:9 screen,
 * no clip), so a swap uploads one picture and rasterises nothing; the page's fades are one static layer on top,
 * painted once.
 * @param {Object} obj
 * @param {String} [obj.src] picture to show
 * @param {String} [obj.preview] a small version of it, shown first while the big one downloads (4K art takes a while);
 *     skipped when the big one is already in the cache
 * @param {'home'|'detail'|'dim'} [obj.variant] which fades to paint over it
 * @param {Number} [obj.delay] wait this long for `src` to settle before loading it
 * @param {Number} [obj.fullDelay] with a preview: wait this long more before downloading the big one, so browsing
 *     quickly only fetches previews and leaves the network to the API
 */
const Backdrop = ({ src, preview, variant = 'home', delay = 0, fullDelay = 0, className }) => {
    /** @type {[{srcs: Array<String>, front: Number, settled: Boolean}, Function]} */
    const [state, setState] = useState({ srcs: [null, null], front: 0, settled: true })
    /** @type {{current: String}} */
    const wantedRef = useRef(null)

    useEffect(() => {
        wantedRef.current = src
        let cancelled = false
        let settleTimer = null
        let fullShown = false
        let fullTimer = null
        /** @type {Array<HTMLImageElement>} downloads in flight, dropped when the picture changes */
        const loading = []
        const show = (url, isFull) => {
            if (cancelled || wantedRef.current !== src || (!isFull && fullShown)) {
                return
            }
            fullShown = fullShown || isFull
            setState(prev => {
                if (prev.srcs[prev.front] === url) {
                    return prev
                }
                const front = prev.front === 0 ? 1 : 0
                const srcs = prev.srcs.slice()
                srcs[front] = url
                return { srcs, front, settled: false }
            })
            clearTimeout(settleTimer)
            settleTimer = setTimeout(() => setState(prev => ({ ...prev, settled: true })), 500)
        }
        /** the stored copy of the picture (downloaded and stored first if new), decoded off screen, then shown */
        const load = (url, isFull) => {
            getStoredImage(url).then(stored => {
                if (cancelled) {
                    return
                }
                const img = new window.Image()
                const done = () => show(stored, isFull)
                loading.push(img)
                img.src = stored
                if (img.decode) {
                    img.decode().then(() => {
                        markReady(url)
                        done()
                    }, done)
                } else {
                    img.onload = done
                    img.onerror = done
                }
            })
        }
        let previewTimer = null
        const timer = setTimeout(() => {
            const withPreview = preview && preview !== src && !isReady(src)
            if (withPreview) {
                previewTimer = setTimeout(() => load(preview, false), fullDelay ? 0 : PREVIEW_GRACE_MS)
            }
            if (src) {
                fullTimer = setTimeout(() => load(src, true), withPreview ? fullDelay : 0)
            }
        }, delay)
        return () => {
            cancelled = true
            clearTimeout(timer)
            clearTimeout(previewTimer)
            clearTimeout(fullTimer)
            clearTimeout(settleTimer)
            loading.forEach(img => {
                if (!img.complete) {
                    img.src = ''  // stops the download
                }
            })
        }
    }, [src, preview, delay, fullDelay])

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
    preview: PropTypes.string,
    variant: PropTypes.oneOf(['home', 'detail', 'dim']),
    delay: PropTypes.number,
    fullDelay: PropTypes.number,
    className: PropTypes.string,
}

export default Backdrop
