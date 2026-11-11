
import { useEffect, useCallback, useRef, useMemo } from 'react'
import ri from '@enact/ui/resolution'
import VirtualList from '@enact/moonstone/VirtualList'

import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import withNavigable from '../../hooks/navigable'
import LoadingList from '../LoadingList'
import { formatDurationMs, getDuration } from '../../utils'
import useGetImagePerResolution from '../../hooks/getImagePerResolution'
import css from './EpisodesList.module.less'


const NavigableDiv = withNavigable('div', '')

/**
 * Render an item
 * @param {Object} obj
 * @param {Array<Object>} obj.episodes
 * @param {Array<Object>} obj.images
 * @param {Number} obj.index
 * @param {Number} obj.itemHeight
 */
const renderItem = ({ episodes, images, index, itemHeight: height, ...rest }) => {
    const episode = episodes[index]
    return (
        <NavigableDiv className={`cr-own ${css.episode}`} key={index} style={{ height }} {...rest}>
            <div className={css.thumb}>
                {images[index] && <img src={images[index].source} alt='' />}
                <div className={css.progress}>
                    <i style={{ width: `${(episode.playhead && episode.playhead.progress) || 0}%` }} />
                </div>
                {episode.showPremium && <div className={css.premium}>{$L('Premium')}</div>}
            </div>
            <div className={css.info}>
                <div className={css.title}>
                    {episode.episode_number && <b>{episode.episode_number}</b>}
                    {episode.title}
                </div>
                <div className={css.duration}>{formatDurationMs(getDuration(episode))}</div>
                <div className={css.description}>{episode.description || ''}</div>
            </div>
        </NavigableDiv>
    )
}

/**
 * @param {Object} obj
 * @param {Array<Object>} [obj.episodes]
 * @param {Number} [obj.episodeIndex]
 * @param {Function} obj.selectEpisode
 */
const EpisodesList = ({ episodes, episodeIndex, selectEpisode, ...rest }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {Number} */
    const itemHeight = ri.scale(236)
    /** @type {{current: Number}} */
    const episodeIndexRef = useRef(null)
    /** @type {Function} */
    const getImagePerResolution = useGetImagePerResolution()
    /** @type {Array<{source: String}>} */
    const images = useMemo(() => {
        let out = []
        if (episodes) {
            out = episodes.map(episode => {
                if (!episode.list_image) {
                    episode.list_image = getImagePerResolution({ height: itemHeight, content: episode })
                }
                return episode.list_image
            })
        }
        return out
    }, [itemHeight, episodes, getImagePerResolution])

    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    useEffect(() => {
        episodeIndexRef.current = episodeIndex
    }, [episodeIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && episodeIndexRef.current != null) {
                clearInterval(interval)
                scrollToRef.current({ index: episodeIndexRef.current, animate: false, focus: true })
            }
        }, 100)
        return () => {
            clearInterval(interval)
        }
    }, [])

    return (
        <LoadingList
            list={episodes}
            index={episodeIndex}
            scrollFn={scrollToRef.current}>
            {episodes && episodes.length > 0 &&
                <VirtualList
                    {...rest}
                    dataSize={episodes.length}
                    itemRenderer={renderItem}
                    itemSize={itemHeight}
                    cbScrollTo={getScrollTo}
                    direction='vertical'
                    verticalScrollbar='hidden'
                    childProps={{
                        onClick: selectEpisode,
                        itemHeight,
                        episodes,
                        images,
                    }}
                />
            }
        </LoadingList>
    )
}

EpisodesList.propTypes = {
    episodes: PropTypes.array,
    episodeIndex: PropTypes.number,
    selectEpisode: PropTypes.func.isRequired,
}

export default EpisodesList
