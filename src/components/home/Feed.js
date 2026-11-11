import { useCallback, useEffect, useRef, useMemo, useState } from 'react'
import ri from '@enact/ui/resolution'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import HomeFeedRow, { ROW_HEIGHT, getProgress } from './FeedRow'
import VirtualListNested from '../../patch/VirtualListNested'
import Backdrop from '../ui/Backdrop'
import HeroInfo from '../ui/HeroInfo'
import { pickBackdrop } from '../ui/images'
import { getFakeFeedItem } from '../../hooks/homefeedWorker'
import { useViewBackup } from '../../hooks/viewBackup'
import { $L } from '../../hooks/language'
import { getDuration } from '../../utils'
import css from './Feed.module.less'


/** the hero follows the focus once it settles, so moving along a row doesn't redraw it on every press */
const SETTLE_MS = 350

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
 * `setterRef`, so a key press re-renders nothing but this, and only once the focus has settled.
 * @param {Object} obj
 * @param {{current: Function}} obj.setterRef
 */
const HeroArea = ({ setterRef }) => {
    /** @type {[Object, Function]} */
    const [content, setContent] = useState(null)
    /** @type {{current: Number}} */
    const timerRef = useRef(null)
    /** @type {{current: Boolean}} */
    const shownRef = useRef(false)

    useEffect(() => {
        setterRef.current = (newContent) => {
            clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                shownRef.current = true
                setContent(newContent)
            }, shownRef.current ? SETTLE_MS : 0)
        }
        return () => {
            clearTimeout(timerRef.current)
            setterRef.current = null
        }
    }, [setterRef])

    return (
        <>
            <Backdrop src={pickBackdrop(content)} variant='home' />
            <div className={css.hero}>
                {content &&
                    <HeroInfo content={content} lines={3}>
                        <Resume content={content} />
                    </HeroInfo>
                }
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

    /** @type {Function} */
    const renderRow = useCallback(({ index, ...rest }) => (
        <HomeFeedRow
            key={`homeRow-${feedType}-${homeFeed.id}-${index}`}
            feedRow={homeFeed.items[index]}
            {...rest} />
    ), [feedType, homeFeed])

    /** @type {Function} */
    const setContent = useCallback((content, rowIndex) => {
        viewBackupRef.current = { rowIndex }
        if (heroSetterRef.current) {
            heroSetterRef.current(content)
        }
    }, [viewBackupRef])

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
            homeFeedType: homeFeed.type,
        }
    }), [profile, itemHeigth, homeFeed, feedType, fakeItem, setContent])

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
