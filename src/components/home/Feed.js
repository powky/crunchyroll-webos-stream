import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import HomeFeedRow, { ROW_HEIGHT, getProgress } from './FeedRow'
import VirtualListNested from '../../patch/VirtualListNested'
import Backdrop from '../ui/Backdrop'
import HeroInfo from '../ui/HeroInfo'
import { SkeletonHero } from '../ui/Skeleton'
import { pickBackdrop, pickHeroBackdrop, pickLogo } from '../ui/images'
import { preload } from '../ui/preload'
import { getFakeFeedItem } from '../../hooks/homefeedWorker'
import { getArtContent, getKnownArt, prefetchArt } from '../../hooks/seriesArt'
import { useViewBackup } from '../../hooks/viewBackup'
import { $L } from '../../hooks/language'
import { getDuration } from '../../utils'
import { useRecoilValue } from 'recoil'
import { currentProfileState } from '../../recoilConfig'
import css from './Feed.module.less'


/** the hero follows the focus once it settles, so moving along a row doesn't redraw it on every press */
const SETTLE_MS = 250
/** home art size: 1440p, the home art changes with the focus, and a 4K texture upload stalls this TV's GPU */
const HERO_WIDTH = 2560
/** the hero's own picture gets the network first; then what's around it */
const PRELOAD_AFTER_MS = 700
/** of what's around, how many backdrops to keep decoded: right, left and below */
const DECODED_AROUND = 3

/**
 * What the focus can reach in one or two presses, nearest first: right and left, the rows below and above, then
 * one further along the row
 * @param {Object<Number, Array<Object>>} rows loaded rows by index
 * @param {Number} rowIndex
 * @param {Number} columnIndex
 * @returns {Array<Object>}
 */
const getAround = (rows, rowIndex, columnIndex) => {
    const at = (r, c) => {
        const items = rows[r]
        return items && items.length ? items[Math.max(0, Math.min(c, items.length - 1))] : null
    }
    return [
        at(rowIndex, columnIndex + 1), at(rowIndex, columnIndex - 1),
        at(rowIndex + 1, columnIndex), at(rowIndex - 1, columnIndex),
        at(rowIndex, columnIndex + 2), at(rowIndex + 1, columnIndex + 1), at(rowIndex, columnIndex - 2),
    ].filter(Boolean)
}

/**
 * Progress line under the hero of something half watched
 * @param {Object} obj
 * @param {Object} obj.content
 */
const Resume = ({ content }) => {
    const progress = getProgress(content)
    const duration = getDuration(content)
    if (!progress || progress >= 98) {
        return null
    }
    let label = ''
    if (duration) {
        const left = Math.max(1, Math.round((duration / 60000) * (100 - progress) / 100))
        label = `${$L('{n} min left').replace('{n}', left)}`
    }
    return (
        <div className={css.resume}>
            <div className={css.resumeBar}><i style={{ width: `${progress}%` }} /></div>
            {label}
        </div>
    )
}

/**
 * Artwork and text of the focused item. Holds its own state: the shelves hand it the focused content through
 * `setterRef`, so a key press re-renders nothing but this, and only once the focus has settled. Then the art of what's
 * around it downloads, so the next hero shows sharp at once.
 * @param {Object} obj
 * @param {{current: Function}} obj.setterRef
 */
const HeroArea = ({ setterRef }) => {
    /** @type {import('crunchyroll-js-api').Types.Profile} */
    const profile = useRecoilValue(currentProfileState)
    /** @type {[{content: Object, art: Object}, Function]} art: whose artwork and logo (an episode's series) */
    const [hero, setHero] = useState({ content: null, art: null })
    /** @type {{current: Number}} */
    const timerRef = useRef(null)
    /** @type {{current: Boolean}} */
    const shownRef = useRef(false)
    /** @type {{current: Object}} */
    const wantedRef = useRef(null)
    /** @type {{current: Number}} */
    const preloadTimerRef = useRef(null)

    useEffect(() => {
        setterRef.current = (newContent, around = []) => {
            wantedRef.current = newContent
            clearTimeout(timerRef.current)
            clearTimeout(preloadTimerRef.current)
            timerRef.current = setTimeout(() => {
                shownRef.current = true
                getArtContent(profile, newContent).then(artContent => {
                    if (wantedRef.current === newContent) {
                        setHero({ content: newContent, art: artContent })
                    }
                })
                preloadTimerRef.current = setTimeout(() => {
                    const urls = []
                    const toDecode = []
                    around.forEach((item, index) => {
                        const itemArt = getKnownArt(profile, item)
                        const backdrop = itemArt && pickHeroBackdrop(itemArt, HERO_WIDTH)
                        if (backdrop) {
                            urls.push(backdrop, pickLogo(itemArt))
                            if (index < DECODED_AROUND) {
                                toDecode.push(backdrop)
                            }
                        }
                    })
                    preload(urls, toDecode)
                }, PRELOAD_AFTER_MS)
            }, shownRef.current ? SETTLE_MS : 0)
        }
        return () => {
            clearTimeout(timerRef.current)
            clearTimeout(preloadTimerRef.current)
            setterRef.current = null
        }
    }, [setterRef, profile])

    const { content, art } = hero
    return (
        <>
            <Backdrop src={pickHeroBackdrop(art, HERO_WIDTH) || pickBackdrop(content)} preview={pickHeroBackdrop(art, 960)}
                variant='home' />
            <div className={css.hero}>
                {content &&
                    <HeroInfo content={content} logo={pickLogo(art)} lines={3}>
                        <Resume content={content} />
                    </HeroInfo>
                }
                {!content && <SkeletonHero style={{ paddingTop: 40 }} />}
            </div>
        </>
    )
}

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {{id: Number, items: Array<import('../hooks/homefeedWorker').HomefeedItem>}} obj.homeFeed
 * @param {'home'|'music'} obj.feedType
 */
const HomeFeed = ({ profile, homeFeed, feedType, className, ...rest2 }) => {
    const { viewBackup, viewBackupRef } = useViewBackup(`homeFeed-${feedType}-${homeFeed.id}`)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const rowIndexRef = useRef(viewBackup?.rowIndex || 0)
    /** @type {{current: Function}} */
    const heroSetterRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    /** @type {Number} */
    const itemHeigth = ri.scale(ROW_HEIGHT)
    /** @type {Object} */
    const fakeItem = useMemo(getFakeFeedItem, [])
    /** @type {{current: Object<Number, Array<Object>>}} rows loaded so far, to know what's around the focus */
    const rowsRef = useRef({})

    useEffect(() => { rowsRef.current = {} }, [homeFeed.id])

    /** @type {Function} */
    const renderRow = useCallback(({ index, ...rest }) => (
        <HomeFeedRow
            key={`homeRow-${feedType}-${homeFeed.id}-${index}`}
            feedRow={homeFeed.items[index]}
            {...rest} />
    ), [feedType, homeFeed])

    /** @type {Function} */
    const setContent = useCallback((content, rowIndex, columnIndex = 0) => {
        viewBackupRef.current = { rowIndex }
        if (heroSetterRef.current) {
            heroSetterRef.current(content, getAround(rowsRef.current, rowIndex, columnIndex))
        }
    }, [viewBackupRef])

    /** a row's cards are in: fetch their keyart (one request per row), so their heroes need no request later */
    const onRowData = useCallback((rowIndex, items) => {
        rowsRef.current[rowIndex] = items
        prefetchArt(profile, items)
    }, [profile])

    const childProps = useMemo(() => ({
        profile,
        id: 'rowFeed',
        cellId: 'cellFeed',
        itemSize: itemHeigth,
        rowInfo: {
            feedId: homeFeed.id,
            feedType,
            fakeItem,
            setContent,
            onRowData,
            homeFeedType: homeFeed.type,
        }
    }), [profile, itemHeigth, homeFeed, feedType, fakeItem, setContent, onRowData])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current) {
                clearInterval(interval)
                scrollToRef.current({ index: rowIndexRef.current, animate: false, focus: false })
            }
        }, 100)
        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <div className={classNames(css.feed, className, { [css.withHeader]: feedType === 'music' })} {...rest2}>
            <HeroArea setterRef={heroSetterRef} />
            <div className={css.shelves}>
                <VirtualListNested
                    dataSize={homeFeed.items.length}
                    itemRenderer={renderRow}
                    itemSize={itemHeigth}
                    childProps={childProps}
                    direction='vertical'
                    verticalScrollbar='hidden'
                    horizontalScrollbar='hidden'
                    cbScrollTo={getScrollTo}
                />
            </div>
        </div>
    )
}

HomeFeed.propTypes = {
    profile: PropTypes.object.isRequired,
    homeFeed: PropTypes.shape({
        id: PropTypes.number.isRequired,
        items: PropTypes.arrayOf(PropTypes.object).isRequired,
    }).isRequired,
    feedType: PropTypes.oneOf(['home', 'music']),
}

export default HomeFeed
