import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'

import { useSetRecoilState, useRecoilValue } from 'recoil'

import { homeViewReadyState, isPremiumState } from '../../recoilConfig'
import api from '../../api'
import VirtualListNested from '../../patch/VirtualListNested'
import Card, { CARD_LIFT } from '../ui/Card'
import { Bone, Skeleton, SkeletonCards } from '../ui/Skeleton'
import { pickImage } from '../ui/images'
import { getEpisodeLabel, getMetaParts } from '../ui/HeroInfo'
import { useNavigateContent } from '../../hooks/navigate'
import { processItemFeed } from '../../hooks/homefeedWorker'
import { $L } from '../../hooks/language'
import { getDuration, getIsPremium, isPlayable } from '../../utils'
import css from './FeedRow.module.less'
import { DEV_FAST_SELECT, DEV_CONTENT_TYPE } from '../../const'


/** artwork width; each cell adds the card's focus margin (see Card's @lift) on both sides */
export const CARD_WIDTH = 384
export const CELL_WIDTH = CARD_WIDTH + 2 * CARD_LIFT
/** row title + card + two lines of text: the shelves show exactly one */
export const ROW_HEIGHT = 400

/**
 * Watched percentage of a playable item
 * @param {Object} item
 * @returns {Number}
 */
export const getProgress = (item) => {
    let progress = 0
    if (item && isPlayable(item.type) && item.playhead !== undefined && item.playhead !== null) {
        const duration = getDuration(item)
        if (typeof item.playhead === 'number') {
            if (duration) {
                progress = item.playhead / (duration / 1000) * 100
            }
        } else {
            progress = item.playhead.progress || 0
        }
    }
    return Math.max(0, Math.min(100, progress))
}

/**
 * Second line under a card
 * @param {Object} item
 * @returns {String}
 */
export const getCardSubtitle = (item) => {
    let out = ''
    if (item.type === 'episode') {
        out = getEpisodeLabel(item)
    } else if (isPlayable(item.type)) {
        out = item.subTitle || ''
        const duration = getDuration(item)
        if (duration) {
            out = out ? `${out} · ${Math.round(duration / 60000)} min` : `${Math.round(duration / 60000)} min`
        }
    } else if (item.type === 'musicArtist') {
        out = $L('Artist')
    } else {
        out = getMetaParts(item).parts.slice(0, 2).join(' · ')
    }
    return out
}

/**
 * A poster card for any feed item
 * @param {Object} obj
 * @param {Object} obj.item
 * @param {Number} obj.itemSize cell width
 * @param {Boolean} obj.isPremium account is premium
 */
export const Poster = ({ item, itemSize, isPremium, style, ...rest }) => {
    const showPremium = isPlayable(item.type) && !isPremium && getIsPremium(item)
    const newStyle = Object.assign({}, style, { width: itemSize })
    return (
        <Card {...rest}
            style={newStyle}
            image={pickImage(item, { mode: item.type === 'episode' ? 'thumb' : 'wide', minWidth: 760 })}
            width={CARD_WIDTH}
            title={item.title || item.name}
            subtitle={getCardSubtitle(item)}
            progress={getProgress(item)}
            badge={showPremium ? $L('Premium') : null} />
    )
}

const HomeFeedItem = ({ feed, index, ...rest }) => (
    <Poster item={feed.items[index]} {...rest} />
)

/**
 * @typedef RowInfo
 * @type {Object}
 * @property {Number} feedId
 * @property {'home'|'music'} feedType
 * @property {{id: String, items: Array}} fakeItem
 * @property {Function} setContent
 * @property {'legacy'|'new'} homeFeedType
 *
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.cellId
 * @param {Number} obj.itemSize
 * @param {{id: String, items: Array, index: Number}} obj.feedRow
 * @param {RowInfo} obj.rowInfo
 * @param {String} obj.style
 * @param {String} obj.className
 */
const HomeFeedRow = ({ profile, cellId, itemSize, feedRow, rowInfo, style, className, ...rest }) => {
    const { feedType, feedId, fakeItem, setContent, onRowData, homeFeedType } = rowInfo  // has to separte to avoid recall
    // to keep index after go back, key has to be same in each row
    const { navigateContent, viewBackup, viewBackupRef } = useNavigateContent(`homeFeedRow-${feedType}-${feedId}`)
    /** @type {[import('../../hooks/homefeedWorker').FeedItemType, Function]} */
    const [feedData, setFeedData] = useState(null)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: {rowIndex: Number, columnIndex: Number}}} */
    const rowIndexRef = useRef(viewBackup || {})
    /** @type {Number} */
    const itemWidth = ri.scale(CELL_WIDTH)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {Function} */
    const selectElement = useCallback((ev) => {
        const index = parseInt(ev.target.dataset.index)
        if (feedData.id !== 'fake_item') {
            setContent(feedData.items[index], feedRow.index, index)
        } else {
            setContent(null, feedRow.index)
        }
    }, [feedData, setContent, feedRow])
    const currentIndex = useRef(feedRow.index)

    /** @type {Function} */
    const setLocalContent = useCallback((ev) => {
        /** @type {HTMLElement} */
        const parentElement = ev.target.closest(`#${cellId}`)
        const columnIndex = parseInt(parentElement.dataset.index)
        const content = feedData.items[columnIndex]
        if (feedData.id !== 'fake_item') {
            viewBackupRef.current = { rowIndex: feedRow.index, columnIndex }
            navigateContent(content)
        }
    }, [feedData, feedRow, cellId, navigateContent, viewBackupRef])

    const newStyle = useMemo(() => Object.assign({}, style, { height: itemSize, }), [style, itemSize])
    const newClassName = useMemo(() => `${className} ${css.homeFeedRow}`, [className])

    useEffect(() => {
        let interval = null
        if (feedData) {
            interval = setInterval(() => {
                if (scrollToRef.current) {
                    clearInterval(interval)
                    let columnIndex = null
                    const rowIndex = (rowIndexRef.current.rowIndex || 0)
                    if (feedData.index === rowIndex) {
                        columnIndex = rowIndexRef.current.columnIndex || 0
                    }
                    if (columnIndex !== null) {
                        setHomeViewReady(true)
                        if (feedData.resource_type === 'dynamic_collection') {
                            scrollToRef.current({ index: 0, animate: false, focus: true })
                        } else {
                            scrollToRef.current({ index: columnIndex, animate: false, focus: true })
                        }
                    }
                }
            }, 100)
        }
        return () => {
            clearInterval(interval)
        }
    }, [feedData, setHomeViewReady])

    useEffect(() => {
        if (feedData && DEV_FAST_SELECT && DEV_CONTENT_TYPE) {
            const testContent = {
                series: ['GJ0H7QGQK', 'GRDV0019R'],
                episode: ['GZ7UV13VE'],
                musicArtist: ['MA899F289'],
                musicConcert: ['MC413F8154'],
                musicVideo: ['MV22070F02']
            }
            const content = feedData.items.find(
                val => val.type === DEV_CONTENT_TYPE && testContent[DEV_CONTENT_TYPE].includes(val.id)
            )
            if (content) {
                navigateContent(content)
            }
        }
    }, [feedData, navigateContent])

    useEffect(() => {  // have to save current index and clean setFeedData for lazy load or virtualList
        currentIndex.current = feedRow.index
        return () => setFeedData(null)
    }, [feedRow])

    useEffect(() => {
        const loadData = async () => {
            const cacheKey = `/home/${feedType}/feed/${feedId}/${feedRow.index}`
            let newFeedItem = await api.utils.getCustomCache(cacheKey)
            if (!newFeedItem) {
                try {
                    newFeedItem = await processItemFeed(feedRow, profile, feedType, homeFeedType)
                    if (newFeedItem.items.length) {
                        if (newFeedItem.resource_type !== 'dynamic_collection') {
                            api.utils.saveCustomCache(cacheKey, newFeedItem, 3 * 60 * 60)  // 3h
                        }
                    } else {
                        newFeedItem = fakeItem
                    }
                } catch (_e) {
                    newFeedItem = fakeItem
                }
            }
            return newFeedItem
        }
        loadData().then(newFeedItem => {
            if (currentIndex.current === feedRow.index) {
                setFeedData(newFeedItem)
                if (newFeedItem.id !== 'fake_item') {
                    onRowData(feedRow.index, newFeedItem.items)
                }
            }
        })
    }, [profile, feedRow, feedType, homeFeedType, feedId, fakeItem, onRowData])

    return (
        <div className={newClassName} style={newStyle} {...rest}>
            {!feedData && <>
                <Skeleton className={css.rowTitle}><Bone w={260} h={28} r={8} style={{ marginTop: 4 }} /></Skeleton>
                <div className={css.rowList}>
                    <SkeletonCards width={CARD_WIDTH} />
                </div>
            </>}
            {feedData && <>
                <h2 className={css.rowTitle}>{feedData.title}</h2>
                <div className={css.rowList}>
                    <VirtualListNested
                        dataSize={feedData.items.length}
                        itemRenderer={HomeFeedItem}
                        itemSize={itemWidth}
                        childProps={{
                            id: cellId,
                            itemSize: itemWidth,
                            feed: feedData,
                            onFocus: selectElement,
                            onClick: setLocalContent,
                            isPremium,
                        }}
                        direction='horizontal'
                        verticalScrollbar='hidden'
                        horizontalScrollbar='hidden'
                        cbScrollTo={getScrollTo}
                    />
                </div>
            </>}
        </div>
    )
}

HomeFeedRow.propTypes = {
    // required fields for virtualListNated
    id: PropTypes.string.isRequired,
    cellId: PropTypes.string.isRequired,
    itemSize: PropTypes.number.isRequired,
    // <-
    profile: PropTypes.object.isRequired,
    feedRow: PropTypes.object.isRequired,
    rowInfo: PropTypes.shape({
        feedId: PropTypes.number.isRequired,
        feedType: PropTypes.oneOf(['home', 'music']),
        fakeItem: PropTypes.object.isRequired,
        setContent: PropTypes.func.isRequired,
        onRowData: PropTypes.func.isRequired,
        homeFeedType: PropTypes.oneOf(['legacy', 'new']).isRequired,
    })
}

export default HomeFeedRow
