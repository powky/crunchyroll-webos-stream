import { useCallback, useEffect, useRef } from 'react'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import css from './PillRow.module.less'


/** coming into the row lands on the selected pill, not on whichever is nearest */
const RowContainer = SpotlightContainerDecorator({
    enterTo: 'default-element',
    defaultElement: '[data-pill-selected="true"]',
}, 'div')

/** room left at a faded edge, so the focused pill never sits under the fade */
const FADE = 64

/**
 * A row of small pills (categories, filters) that can be wider than the screen: it slides, on its own layer, to keep
 * the focused pill in view, and the edge with more pills behind it fades out (a mask: sliding re-renders nothing).
 * Mark the selected pill with `data-pill-selected`.
 * @param {Object} obj
 * @param {String} [obj.spotlightId]
 */
const PillRow = ({ spotlightId, className, children }) => {
    /** @type {{current: HTMLElement}} */
    const innerRef = useRef(null)
    /** @type {{current: Number}} */
    const offsetRef = useRef(0)

    /** @param {HTMLElement} [pill] focused pill */
    const place = useCallback(pill => {
        const inner = innerRef.current
        const row = inner && inner.parentNode
        if (!row) {
            return
        }
        const visible = row.clientWidth
        const minOffset = Math.min(0, visible - inner.scrollWidth)
        let offset = offsetRef.current
        if (pill) {
            const left = pill.offsetLeft
            const right = left + pill.offsetWidth
            if (left + offset < FADE) {
                offset = FADE - left
            } else if (right + offset > visible - FADE) {
                offset = visible - FADE - right
            }
        }
        offset = Math.max(minOffset, Math.min(0, offset))
        if (offset !== offsetRef.current) {
            offsetRef.current = offset
            inner.style.transform = `translate3d(${offset}px, 0, 0)`
        }
        row.classList.toggle(css.fadeLeft, offset < 0)
        row.classList.toggle(css.fadeRight, offset > minOffset)
    }, [])

    const onFocus = useCallback(ev => {
        let pill = ev.target
        while (pill && pill.parentNode !== innerRef.current) {
            pill = pill.parentNode
        }
        if (pill) {
            place(pill)
        }
    }, [place])

    useEffect(() => place(), [children, place])

    return (
        <RowContainer className={classNames(css.row, className)} spotlightId={spotlightId} onFocus={onFocus}>
            <div className={css.inner} ref={innerRef}>
                {children}
            </div>
        </RowContainer>
    )
}

PillRow.propTypes = {
    spotlightId: PropTypes.string,
    className: PropTypes.string,
    children: PropTypes.node,
}

export default PillRow
