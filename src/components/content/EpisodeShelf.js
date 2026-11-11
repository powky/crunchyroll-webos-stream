import { useEffect, useCallback, useRef } from 'react'
import ri from '@enact/ui/resolution'
import VirtualList from '@enact/moonstone/VirtualList'
import PropTypes from 'prop-types'

import Card, { CARD_LIFT } from '../ui/Card'
import { SkeletonCards } from '../ui/Skeleton'
import { pickImage } from '../ui/images'
import { getProgress } from '../home/FeedRow'
import LoadingList from '../LoadingList'
import { $L } from '../../hooks/language'
import { getDuration } from '../../utils'
import css from './ContentDetail.module.less'


const EP_WIDTH = 420
/** each card carries its focus margin on both sides */
const EP_CELL = EP_WIDTH + 2 * CARD_LIFT

/**
 * @param {Object} obj
 * @param {Array<Object>} obj.episodes
 * @param {Number} obj.index
 */
const renderEpisode = ({ episodes, index, style, ...rest }) => {
    const episode = episodes[index]
    const duration = getDuration(episode) || episode.duration_ms
    const playhead = episode.playhead || {}
    return (
        <Card {...rest}
            style={Object.assign({}, style, { width: EP_CELL })}
            image={pickImage(episode, { mode: 'thumb', minWidth: 800 })}
            width={EP_WIDTH}
            number={episode.episode_number || episode.episode || null}
            title={episode.title || ''}
            text={episode.description || ''}
            progress={playhead.fully_watched ? 100 : getProgress(episode)}
            watched={!!playhead.fully_watched}
            duration={duration ? `${Math.max(1, Math.round(duration / 60000))} min` : null}
            badge={episode.showPremium ? $L('Premium') : null} />
    )
}

/**
 * Horizontal row of episodes (or movies, or music videos)
 * @param {Object} obj
 * @param {Array<Object>} [obj.episodes]
 * @param {Number} [obj.episodeIndex] episode to scroll to
 * @param {Function} obj.selectEpisode click handler, the index is in `data-index`
 * @param {Boolean} [obj.autoFocus] focus `episodeIndex` once shown (coming back from the player)
 * @param {String} [obj.upTarget] spotlight selector for Up from any card (the season tabs), instead of the nearest
 */
const EpisodeShelf = ({ episodes, episodeIndex, selectEpisode, autoFocus = false, upTarget }) => {
    /** @type {{current: Function}} */
    const scrollToRef = useRef(null)
    /** @type {{current: Number}} */
    const episodeIndexRef = useRef(null)
    /** @type {Function} */
    const getScrollTo = useCallback((scrollTo) => { scrollToRef.current = scrollTo }, [])

    useEffect(() => {
        episodeIndexRef.current = episodeIndex
    }, [episodeIndex])

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollToRef.current && episodeIndexRef.current != null) {
                clearInterval(interval)
                scrollToRef.current({ index: episodeIndexRef.current, animate: false, focus: autoFocus })
            }
        }, 100)
        return () => {
            clearInterval(interval)
        }
    }, [autoFocus])

    return (
        <div className={css.shelfList}>
            <LoadingList
                list={episodes}
                index={episodeIndex}
                scrollFn={scrollToRef.current}
                skeleton={<SkeletonCards width={EP_WIDTH} count={4} lines={3} />}>
                {episodes && episodes.length > 0 &&
                    <VirtualList
                        dataSize={episodes.length}
                        itemRenderer={renderEpisode}
                        itemSize={ri.scale(EP_CELL)}
                        cbScrollTo={getScrollTo}
                        direction='horizontal'
                        horizontalScrollbar='hidden'
                        verticalScrollbar='hidden'
                        childProps={{
                            onClick: selectEpisode,
                            episodes,
                            'data-spot-up': upTarget,
                        }}
                    />
                }
            </LoadingList>
        </div>
    )
}

EpisodeShelf.propTypes = {
    episodes: PropTypes.array,
    episodeIndex: PropTypes.number,
    selectEpisode: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
    upTarget: PropTypes.string,
}

export default EpisodeShelf
