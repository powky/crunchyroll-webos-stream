
import { useCallback, useEffect, useRef, useMemo } from 'react'
import { VirtualGridList } from '@enact/moonstone/VirtualList'
import ri from '@enact/ui/resolution'
import DateFmt from 'ilib/lib/DateFmt'

import PropTypes from 'prop-types'

import LoadingList from '../LoadingList'
import Card, { cardHeight, CARD_LIFT } from '../ui/Card'
import { CardBone, Skeleton, SkeletonGrid } from '../ui/Skeleton'
import { pickImage } from '../ui/images'
import { getCardSubtitle } from '../home/FeedRow'
import { useViewBackup } from '../../hooks/viewBackup'


/**
 * Show grid of items
 * @param {Object} obj
 * @param {String} obj.type
 * @param {Array<Object>} obj.contentList
 * @param {Function} obj.onSelect
 * @param {Function} [obj.load]
 * @param {Boolean} [obj.autoScroll]
 * @param {Function} [obj.onFocus]
 * @param {'tall'|'wide'} [obj.mode]
 * @param {Boolean} [obj.dates] under the title, when it was last published (simulcasts) instead of year and seasons
 * @param {Function} [obj.onLeave]
 */
const ContentGridItems = ({ type, contentList, onSelect, load, autoScroll = true, onFocus, mode = 'tall', dates,
    ...rest }) => {
    const { viewBackup, viewBackupRef } = useViewBackup(`contentGridItems-${type}`)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const rowIndexRef = useRef(viewBackup?.rowIndex || 0)
    /** artwork width (wide ones as on the home rows); cells add the card's focus margin and two lines of text */
    const cardWidth = mode === 'tall' ? 232 : 384
    /** @type {[Number, Number]} */
    const [itemHeight, itemWidth] = useMemo(() => {
        return [ri.scale(CARD_LIFT + cardHeight(cardWidth, mode) + 80), ri.scale(cardWidth + 2 * CARD_LIFT)]
    }, [mode, cardWidth])
    /** @type {import('ilib/lib/DateFmt')} */
    const dateFmt = useMemo(() => new DateFmt({ type: 'datetime', length: 'short', clock: '12' }), [])

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    /** @type {Function} */
    const onSelectItem = useCallback((ev) => {
        if (ev.currentTarget) {
            const rowIndex = parseInt(ev.currentTarget.dataset['index'])
            /** backup all state to restore later */
            viewBackupRef.current = { rowIndex }
            onSelect(contentList[rowIndex])
        }
    }, [contentList, onSelect, viewBackupRef])

    /** @type {Function} */
    const renderItem = useCallback(({ index, ...rest2 }) => {
        let out
        const contentItem = contentList[index]
        if (contentItem) {
            /** @type {String} */
            let dateStr = dates && contentItem.last_public && dateFmt.format(new Date(contentItem.last_public)) || ''
            dateStr = dateStr.endsWith('.') ? dateStr.slice(0, -1) : dateStr
            out = (
                <Card
                    {...rest2}
                    data-index={index}
                    image={pickImage(contentItem, { mode, minWidth: mode === 'tall' ? 460 : 700 })}
                    width={cardWidth}
                    mode={mode}
                    title={(contentItem.title || '').replace(/\n/g, '')}
                    subtitle={dateStr || getCardSubtitle(contentItem) || (contentItem.description || '').replace(/\n/g, ' ')}
                    onClick={onSelectItem}
                    onFocus={onFocus}
                />
            )
        } else {
            if (load) {
                load(index)
            }
            out = (
                <Skeleton {...rest2}>
                    <CardBone width={cardWidth} mode={mode} />
                </Skeleton>
            )
        }
        return out
    }, [contentList, cardWidth, onSelectItem, onFocus, load, mode, dateFmt, dates])

    useEffect(() => {
        let interval = null
        if (autoScroll && rowIndexRef.current !== null) {
            interval = setInterval(() => {
                if (scrollToRef.current && contentList != null) {
                    clearInterval(interval)
                    if (contentList.length > 0) {
                        const index = Math.min(rowIndexRef.current, contentList.length - 1)
                        scrollToRef.current({ index, animate: false, focus: true })
                        rowIndexRef.current = null  // avoid focus on search or loading
                    }
                }
            }, 100)
        }
        return () => {
            clearInterval(interval)
        }
    }, [autoScroll, contentList])

    return (
        <LoadingList
            list={contentList}
            index={rowIndexRef.current}
            scrollFn={scrollToRef.current}
            skeleton={<SkeletonGrid width={cardWidth} mode={mode} columns={mode === 'tall' ? 6 : 4} rows={2} />}>
            {contentList && contentList.length > 0 &&
                <VirtualGridList verticalScrollbar='hidden' {...rest}
                    dataSize={contentList.length}
                    itemRenderer={renderItem}
                    itemSize={{ minHeight: itemHeight, minWidth: itemWidth }}
                    spacing={0}
                    cbScrollTo={getScrollTo}
                />
            }
        </LoadingList>
    )
}

ContentGridItems.propTypes = {
    type: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
    contentList: PropTypes.oneOfType([
        PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.bool])),
        PropTypes.oneOf([null]),
    ]),
    autoScroll: PropTypes.bool,
    mode: PropTypes.oneOf(['tall', 'wide']),
    dates: PropTypes.bool,
    load: PropTypes.func,
    onFocus: PropTypes.func,
}

export default ContentGridItems
