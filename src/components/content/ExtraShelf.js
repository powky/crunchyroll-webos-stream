import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ri from '@enact/ui/resolution'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import { useRecoilValue } from 'recoil'

import { Poster, CELL_WIDTH } from '../home/FeedRow'
import LoadingList from '../LoadingList'
import { $L } from '../../hooks/language'
import { useProcessMusicVideos } from '../../hooks/processMusicVideos'
import { isPremiumState } from '../../recoilConfig'
import api from '../../api'
import css from './ContentDetail.module.less'


const CELL = CELL_WIDTH

const renderItem = ({ items, index, ...rest }) => (
    <Poster item={items[index]} {...rest} />
)

/**
 * Similar shows or the show's music, in a row under the buttons
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 * @param {'similar'|'music'} obj.kind
 * @param {Function} obj.setContent
 */
const ExtraShelf = ({ profile, content, kind, setContent }) => {
    /** @type {[Array<Object>, Function]} */
    const [items, setItems] = useState(null)
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {Function} */
    const processVideos = useProcessMusicVideos()
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])
    const title = useMemo(() => (kind === 'music' ? $L('Music') : $L('Similar')), [kind])

    const onSelect = useCallback(ev => {
        const index = parseInt((ev.currentTarget || ev.target).dataset.index)
        if (items && items[index]) {
            setContent(items[index], kind)
        }
    }, [items, setContent, kind])

    useEffect(() => {
        let active = true
        const load = async () => {
            let data = []
            if (kind === 'music') {
                const cacheKey = `options-music/${content.id}`
                data = await api.utils.getCustomCache(cacheKey)
                if (!data) {
                    const res = await api.music.getFeatured(profile, { contentId: content.id, ratings: true })
                    data = res.data
                    processVideos(data)
                    await api.utils.saveCustomCache(cacheKey, data)
                }
            } else {
                const res = await api.discover.getSimilar(profile, { contentId: content.id, ratings: true, quantity: 30 })
                data = (res && res.data) || []
            }
            if (active) {
                setItems(data)
            }
        }
        setItems(null)
        load().catch(() => active && setItems([]))
        return () => { active = false }
    }, [profile, content, kind, processVideos])

    useEffect(() => {  // the row was asked for: take the focus there
        const interval = setInterval(() => {
            if (scrollToRef.current && items && items.length) {
                clearInterval(interval)
                scrollToRef.current({ index: 0, animate: false, focus: true })
            }
        }, 100)
        return () => clearInterval(interval)
    }, [items])

    return (
        <div className={css.seasonShelf}>
            <div className={css.shelfHead}>
                <h2 className={css.shelfTitle}>{title}</h2>
            </div>
            <div className={css.shelfList}>
                <LoadingList list={items} index={0} scrollFn={scrollToRef.current}>
                    {items && items.length > 0 &&
                        <VirtualList
                            dataSize={items.length}
                            itemRenderer={renderItem}
                            itemSize={ri.scale(CELL)}
                            cbScrollTo={getScrollTo}
                            direction='horizontal'
                            horizontalScrollbar='hidden'
                            verticalScrollbar='hidden'
                            childProps={{
                                items,
                                itemSize: ri.scale(CELL),
                                isPremium,
                                onClick: onSelect,
                            }}
                        />
                    }
                </LoadingList>
            </div>
        </div>
    )
}

ExtraShelf.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
    kind: PropTypes.oneOf(['similar', 'music']).isRequired,
    setContent: PropTypes.func.isRequired,
}

export default ExtraShelf
