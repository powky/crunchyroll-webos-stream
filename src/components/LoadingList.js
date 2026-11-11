
import { useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import { SkeletonCards } from './ui/Skeleton'

import { $L } from '../hooks/language'
import cssShared from './Share.module.less'

/**
 * @param {Object} obj
 * @param {Array} [obj.list]
 * @param {Number} [obj.index]
 * @param {Fucntion} [obj.scrollFn]
 * @param {React.ReactNode} [obj.skeleton] the shape of the list while it loads (a row of cards by default)
 * @param {React.ReactNode} [obj.children]
 */
const LoadingList = ({ list, index, scrollFn, skeleton, children }) => {
    /** @type {{current: HTMLDivElement}} */
    const containerRef = useRef(null)
    /** @type {{current: Number}} */
    const clientHeight = useRef(null)

    useEffect(() => {
        if (scrollFn && clientHeight.current != null) {
            if (clientHeight.current !== containerRef.current.clientHeight) {
                scrollFn({ index: Math.min(index, list.length - 1), animate: false, focus: false })
            }
        }
        clientHeight.current = containerRef.current.clientHeight
    })

    return (
        <div className={cssShared.virtualListContainer} ref={containerRef}>
            {!list && (skeleton || <SkeletonCards width={384} />)}
            {list && list.length === 0 &&
                <div className={cssShared.empty}>{$L('Empty')}</div>
            }
            {list && list.length > 0 &&
                children
            }
        </div>
    )
}

LoadingList.propTypes = {
    list: PropTypes.array,
    index: PropTypes.number,
    scrollFn: PropTypes.func,
    skeleton: PropTypes.node,
    children: PropTypes.node
}

export default LoadingList
