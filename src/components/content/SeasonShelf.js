import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import PropTypes from 'prop-types'

import PillButton from '../ui/PillButton'
import EpisodeShelf from './EpisodeShelf'
import { $L } from '../../hooks/language'
import { useBackVideoIndex } from '../../hooks/backVideoIndex'
import { useViewBackup } from '../../hooks/viewBackup'
import { useDelayedCall } from '../../hooks/delayedCall'
import api from '../../api'
import { getIsPremium } from '../../utils'
import css from './ContentDetail.module.less'


/** room left at a faded edge, so the focused tab never sits under the fade */
const TAB_FADE = 64

/** coming down from the buttons lands on the open season, not on whichever tab is nearest */
const TabsContainer = SpotlightContainerDecorator({
    enterTo: 'default-element',
    defaultElement: '[data-tab-selected="true"]',
}, 'div')

/**
 * "Season 2", or the season's own title when several share a number (dubs, specials)
 * @param {Array<Object>} seasons
 * @returns {Array<String>}
 */
const seasonLabels = (seasons) => {
    const numbers = seasons.map(season => season.season_display_number || season.season_sequence_number || season.season_number)
    const unique = numbers.every((number, index) => number && numbers.indexOf(number) === index)
    return seasons.map((season, index) => (unique ? `${$L('Season')} ${numbers[index]}` : (season.title || `${index + 1}`)))
}

/**
 * Season tabs and the episodes of the selected one (was the "Episodes and more" page)
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {{content: Object, setContent: Function}} obj.contentState
 * @param {Boolean} obj.isPremium account is premium?
 * @param {Boolean} [obj.autoFocus] focus the episode coming back from the player
 */
const SeasonShelf = ({ profile, contentState, isPremium, autoFocus }) => {
    const { content: series, setContent: setSeries } = contentState
    const { viewBackup, viewBackupRef } = useViewBackup(`content-seasons-${series.id}`)
    /** @type {[Array<Object>, Function]} */
    const [seasons, setSeasons] = useState(null)
    /** @type {[Number, Function]} */
    const [seasonIndex, setSeasonIndex] = useState(viewBackup?.seasonIndex)
    /** @type {['up'|'down', Function]} */
    const [order, setOrder] = useState(viewBackup?.order || 'up')
    /** @type {[Array<Object>, Function]} */
    const [episodes, setEpisodes] = useState(null)
    /** @type {[Number, Function]} */
    const [episodeIndex, setEpisodeIndex] = useState(null)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)
    /** @type {{current: Number}} */
    const seasonIndexRef = useRef(null)
    /** @type {{current: HTMLElement}} */
    const tabsRef = useRef(null)
    /** @type {{current: Number}} */
    const tabsOffsetRef = useRef(0)
    /** @type {String} */
    const cacheKey = useMemo(() => (
        seasons && seasonIndex != null ? `seasons/${seasons[seasonIndex].id}/episodes` : null
    ), [seasons, seasonIndex])

    /** @type {Array<Object>} */
    const orderedEpisodes = useMemo(
        () => episodes == null ? null : order === 'up' ? episodes : [...episodes].reverse(),
        [episodes, order]
    )
    /** @type {Array<String>} */
    const labels = useMemo(() => (seasons ? seasonLabels(seasons) : []), [seasons])

    const toggleOrder = useCallback(() => {
        setOrder(prev => prev === 'up' ? 'down' : 'up')
    }, [setOrder])

    /** @type {Function} */
    const setContent = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        const index = parseInt(target.dataset.index)
        if (orderedEpisodes && orderedEpisodes.length) {
            /** backup all state to restore later */
            viewBackupRef.current = { seasonIndex, order }
            setSeries(orderedEpisodes[index], 'episodes')
        }
    }, [seasonIndex, orderedEpisodes, setSeries, order, viewBackupRef])

    const markAsWatched = useCallback(() => {
        if (episodes && episodes.filter(ep => !(ep?.playhead?.fully_watched)).length > 0) {
            setLoading(true)
            for (const ep of episodes) {
                if (!ep.playhead) {
                    ep.playhead = {}
                }
                ep.playhead.fully_watched = true
                ep.playhead.progress = 100
            }
            setEpisodes([...episodes])
            api.utils.saveCustomCache(cacheKey, episodes)
            api.discover.markAsWatched(profile, seasons[seasonIndex].id)
                .then(() => console.log('watched'))
                .catch(console.error)
                .finally(() => setLoading(false))
        }
    }, [profile, seasons, seasonIndex, episodes, setLoading, cacheKey])

    const selectSeasonFromEvent = useCallback(ev => {
        const index = parseInt((ev.currentTarget || ev.target).dataset.index)
        if (seasonIndexRef.current !== index) {
            setSeasonIndex(index)
        }
    }, [])
    /** like before: resting on a season tab for a moment opens it */
    const onTabFocusDelayed = useDelayedCall(selectSeasonFromEvent, 500)

    /**
     * Keep the focused tab inside the row: slide the tabs, which have their own layer. An edge with tabs hidden past
     * it fades out (a mask on the row, so sliding re-renders nothing).
     * @param {HTMLElement} [tab] focused tab
     */
    const placeTabs = useCallback(tab => {
        const inner = tabsRef.current
        const row = inner && inner.parentNode
        if (!row) {
            return
        }
        const visible = row.clientWidth
        const minOffset = Math.min(0, visible - inner.scrollWidth)
        let offset = tabsOffsetRef.current
        if (tab) {
            const left = tab.offsetLeft
            const right = left + tab.offsetWidth
            if (left + offset < TAB_FADE) {
                offset = TAB_FADE - left
            } else if (right + offset > visible - TAB_FADE) {
                offset = visible - TAB_FADE - right
            }
        }
        offset = Math.max(minOffset, Math.min(0, offset))
        if (offset !== tabsOffsetRef.current) {
            tabsOffsetRef.current = offset
            inner.style.transform = `translate3d(${offset}px, 0, 0)`
        }
        row.classList.toggle(css.fadeLeft, offset < 0)
        row.classList.toggle(css.fadeRight, offset > minOffset)
    }, [])

    const onTabFocus = useCallback(ev => {
        placeTabs(ev.currentTarget)
        onTabFocusDelayed({ currentTarget: ev.currentTarget })
    }, [placeTabs, onTabFocusDelayed])

    useEffect(() => placeTabs(), [labels, placeTabs])

    useBackVideoIndex(orderedEpisodes, setEpisodeIndex)

    useEffect(() => {
        seasonIndexRef.current = seasonIndex
        setEpisodes(null)  // for activate loading
        setEpisodeIndex(null)  // for activate loading
        if (seasonIndex != null && seasons != null) {
            const loadEpisodes = async () => {
                const cacheEpisodes = await api.utils.getCustomCache(cacheKey)
                if (cacheEpisodes) {
                    setEpisodes(cacheEpisodes)
                } else {
                    const { data: epsData } = await api.cms.getEpisodes(profile, { seasonId: seasons[seasonIndex].id })

                    epsData.forEach(ep => {
                        ep.type = 'episode'
                        ep.showPremium = !isPremium && getIsPremium(ep)
                    })

                    if (epsData.length) {
                        await api.content.calculatePlayheadProgress({ profile, episodesData: epsData })
                    }
                    await api.utils.saveCustomCache(cacheKey, epsData)
                    if (seasonIndex === seasonIndexRef.current) {
                        setEpisodes(epsData)
                    }
                }
            }
            loadEpisodes()
        }
    }, [profile, seasons, seasonIndex, isPremium, cacheKey])

    useEffect(() => {
        api.cms.getSeasons(profile, { serieId: series.id }).then(({ data }) => {
            setSeasons(data)
            setSeasonIndex(lastIndex => {
                if (lastIndex == null) {
                    lastIndex = data.length ? 0 : null
                } else {
                    lastIndex = Math.min(lastIndex, data.length - 1)
                }
                return lastIndex
            })
        })
    }, [profile, series])

    const allWatched = !(orderedEpisodes && orderedEpisodes.filter(ep => !(ep?.playhead?.fully_watched)).length > 0)

    return (
        <div className={css.seasonShelf}>
            <div className={css.shelfHead}>
                <TabsContainer className={css.tabs} spotlightId='season-tabs'>
                    <div className={css.tabsInner} ref={tabsRef}>
                        {labels.map((label, index) => (
                            <PillButton small plain key={index}
                                data-index={index}
                                data-tab-selected={index === seasonIndex}
                                selected={index === seasonIndex}
                                onFocus={onTabFocus}
                                onClick={selectSeasonFromEvent}>
                                {label}
                            </PillButton>
                        ))}
                    </div>
                </TabsContainer>
                <div className={css.tools}>
                    {seasons && seasons.length > 0 &&
                        <PillButton small plain icon='check'
                            disabled={allWatched || loading}
                            onClick={markAsWatched}>
                            {$L('Mark season as watched')}
                        </PillButton>
                    }
                    {seasons && seasons.length > 0 &&
                        <PillButton small plain icon='sort' onClick={toggleOrder}>
                            {order === 'up' ? $L('Oldest first') : $L('Newest first')}
                        </PillButton>
                    }
                </div>
            </div>
            <EpisodeShelf
                key={seasons?.[seasonIndex]?.id ? `seasons-${seasons[seasonIndex].id}` : undefined}
                episodes={seasons && seasons.length === 0 ? [] : orderedEpisodes}
                episodeIndex={episodeIndex}
                selectEpisode={setContent}
                autoFocus={autoFocus}
                upTarget={seasons && seasons.length > 0 ? '@season-tabs' : undefined} />
        </div>
    )
}

SeasonShelf.propTypes = {
    profile: PropTypes.object.isRequired,
    contentState: PropTypes.shape({
        content: PropTypes.object.isRequired,
        setContent: PropTypes.func.isRequired,
    }).isRequired,
    isPremium: PropTypes.bool.isRequired,
    autoFocus: PropTypes.bool,
}

export default SeasonShelf
