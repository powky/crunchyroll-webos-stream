import { useEffect, useCallback, useState } from 'react'
import Spotlight from '@enact/spotlight'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'

import PillButton from '../ui/PillButton'
import PopupMessage from '../Popup'
import { getProgress } from '../home/FeedRow'
import { $L } from '../../hooks/language'
import { getDuration } from '../../utils'
import api from '../../api'
import css from './ContentDetail.module.less'


/**
 * "T1 · E5" of an episode
 * @param {Object} content
 * @returns {String}
 */
const shortEpisode = (content) => {
    const metadata = content.episode_metadata || content
    const season = metadata.season_sequence_number != null ? metadata.season_sequence_number : metadata.season_number
    const episode = metadata.episode_number != null ? metadata.episode_number : metadata.episode
    const parts = []
    if (season != null) {
        parts.push(`${$L('S')}${season}`)
    }
    if (episode != null && episode !== '') {
        parts.push(`${$L('E')}${episode}`)
    }
    return parts.join(' · ')
}

/**
 * get next episode
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<{firstEp: Object, lastEp: Object}>}
 */
const getNextEpisode = async (profile, content) => {
    const out = { firstEp: null, lastEp: null }
    const { data: seasonsData } = await api.cms.getSeasons(profile, { serieId: content.id })

    return Promise.all([
        api.cms.getEpisodes(profile, { seasonId: seasonsData[0].id }),
        seasonsData.length > 1
            ? api.cms.getEpisodes(profile, { seasonId: seasonsData[seasonsData.length - 1].id })
            : Promise.resolve({ data: null })
    ]).then(async ([{ data: firstSeasonEp }, { data: lastSeasonEp }]) => {
        if (firstSeasonEp.length) {
            out.firstEp = firstSeasonEp[0]
            out.firstEp.type = 'episode'
            if (firstSeasonEp.length > 1) {
                out.lastEp = firstSeasonEp[firstSeasonEp.length - 1]
                out.lastEp.type = 'episode'
            }
        }
        if (lastSeasonEp?.length) {
            out.lastEp = lastSeasonEp[lastSeasonEp.length - 1]
            out.lastEp.type = 'episode'
        }
        const eps = [out.firstEp, out.lastEp].filter(ep => !!ep)
        if (eps.length > 0) {
            await api.content.calculatePlayheadProgress({ profile, episodesData: eps })
        }
        return out
    })
}

/**
 * get next movie
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
const getNextMovie = async (profile, content) => {
    const { data: moviesData } = await api.cms.getMovies(profile, { movieListingId: content.id })
    let tmpMovie = moviesData[0]
    tmpMovie.type = 'movie'
    tmpMovie = { ...tmpMovie, ...(tmpMovie.panel || {}), panel: null }
    await api.content.calculatePlayheadProgress({ profile, episodesData: [tmpMovie] })
    return tmpMovie
}

/**
 * get next content
 * @param {Object} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
const getNextContent = async (profile, content) => {
    return new Promise(resolve => {
        const nextProm = api.discover.getNext(profile, {
            contentId: content.id,
            contentType: content.type,
            fnConfig: { cache: false },
        }).then(nextEp => {
            if (nextEp && nextEp.total > 0) {
                if (nextEp.data[0].type === 'movie') {
                    nextEp = { ...nextEp.data[0], ...nextEp.data[0].panel, panel: null }
                } else {
                    nextEp = nextEp.data[0]
                }
            } else {
                nextEp = null
            }
            return nextEp
        })
        /** @type {Promise} */
        let getNextProm = Promise.resolve(null)
        if (content.type === 'series') {
            getNextProm = getNextEpisode(profile, content)
        } else if (content.type === 'movie_listing') {
            getNextProm = getNextMovie(profile, content)
        }
        nextProm.then(nextEp => {
            if (nextEp) {
                resolve(nextEp)
            } else {
                getNextProm.then(resolve)
            }
        })
    })
}

/**
 * Label of the main button: continue or start, and which episode
 * @param {Object} nextContent
 * @returns {String}
 */
const playLabel = (nextContent) => {
    const progress = getProgress(nextContent)
    const verb = progress > 0 && progress < 98 ? $L('Continue') : $L('Watch')
    if (nextContent.type === 'episode') {
        const episode = shortEpisode(nextContent)
        return episode ? `${verb} ${episode}` : verb
    }
    return verb
}

/**
 * Buttons of the detail page, with what each one does from the old options list
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content series or movie listing
 * @param {Function} obj.setContent opens or plays a content
 * @param {String} obj.shelf shelf shown below
 * @param {Function} obj.onShelf shows a shelf below (episodes, similar, music)
 * @param {Function} obj.onAudio opens audio and subtitles
 * @param {Boolean} obj.autoFocus focus the play button once loaded
 */
const DetailActions = ({ profile, content, setContent, shelf, onShelf, onAudio, autoFocus }) => {
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)
    /** @type {[Object, Function]} */
    const [nextContent, setNextContent] = useState(null)
    /** @type {[Object, Function]} */
    const [lastContent, setLastContent] = useState(null)
    /** @type {[Boolean, Function]} */
    const [isInWatchlist, setIsInWatchlist] = useState(false)
    /** @type {[Number, Function]} */
    const [rating, setRating] = useState(0)
    /** @type {[String, Function]} */
    const [hint, setHint] = useState('')
    /** @type {[{type: String, message: String}, Function]}  */
    const [message, setMessage] = useState(null)

    const playNext = useCallback(() => { setContent(nextContent) }, [setContent, nextContent])
    const playLast = useCallback(() => { setContent(lastContent) }, [setContent, lastContent])

    /** the label of a round button shows under the row while it's focused */
    const showHint = useCallback(ev => { setHint(ev.currentTarget.getAttribute('aria-label') || '') }, [])
    const clearHint = useCallback(() => { setHint('') }, [])

    const toggleWatchlist = useCallback(() => {
        if (isInWatchlist) {
            api.content.deleteWatchlistItem(profile, { contentId: content.id })
        } else {
            api.content.addWatchlistItem(profile, { contentId: content.id })
        }
        // invalid cache
        api.content.getWatchlistItems(profile, { contentIds: [content.id], fnConfig: { cache: null } })
        setIsInWatchlist(prev => !prev)
    }, [profile, content, isInWatchlist])

    const markAsWatched = useCallback(() => {
        api.discover.markAsWatched(profile, content.id)
            .then(() => setMessage({ type: 'info', message: $L('Marked as watched') }))
            .catch(err => {
                if (err) {
                    setMessage({ type: 'error', message: err.message || `${err}` })
                } else {
                    setMessage({ type: 'error', message: $L('An error occurred') })
                }
            }).finally(() => setTimeout(() => setMessage(null), 2000))
    }, [profile, content])

    const updateRating = useCallback(ev => {
        const star = parseInt(ev.currentTarget.dataset.star) + 1
        api.review.updateRating(profile, {
            contentId: content.id,
            contentType: content.type,
            rating: `${star}s`
        }).then(() => {
            setRating(star)
            // invalid cache
            api.review.getRatings(profile, { contentId: content.id, contentType: content.type, fnConfig: { cache: null } })
        })
    }, [profile, content])

    const showSimilar = useCallback(() => onShelf('similar'), [onShelf])
    const showMusic = useCallback(() => onShelf('music'), [onShelf])

    useEffect(() => {
        api.review.getRatings(profile, { contentId: content.id, contentType: content.type }).then(ratingRes => {
            if (ratingRes) {
                setRating(parseInt(ratingRes.rating.trimEnd('s')))
            }
        })
    }, [profile, content])

    useEffect(() => {
        setLoading(true)
        Promise.all([
            getNextContent(profile, content),
            api.content.getWatchlistItems(profile, { contentIds: [content.id] }),
        ]).then(([nextEpRes, watchlistRes]) => {
            if (nextEpRes) {
                if (nextEpRes.firstEp) {
                    setNextContent(nextEpRes.firstEp)
                    setLastContent(nextEpRes.lastEp)
                } else {
                    setNextContent(nextEpRes)
                }
            }
            if (watchlistRes) {
                setIsInWatchlist(watchlistRes.total > 0)
            }
            setLoading(false)
        })
    }, [profile, content])

    useEffect(() => {
        if (!loading && autoFocus) {
            Spotlight.focus('#detail-play')
        }
    }, [loading, autoFocus])

    const progress = getProgress(nextContent)
    const duration = nextContent && getDuration(nextContent)
    let resume = ''
    if (progress > 0 && progress < 98 && duration) {
        resume = $L('{n} min left').replace('{n}', Math.max(1, Math.round(duration / 60000 * (100 - progress) / 100)))
    }

    return (
        <div className={css.actionsBlock}>
            {loading && <div className={css.actionsLoading}><Spinner size='small' /></div>}
            {!loading &&
                <div className={css.actions}>
                    {nextContent &&
                        <div className={css.playWrap}>
                            <PillButton id='detail-play' icon='play'
                                onClick={playNext}
                                onFocus={clearHint}>
                                {playLabel(nextContent)}
                            </PillButton>
                        </div>
                    }
                    {lastContent &&
                        <PillButton icon='play' onClick={playLast} onFocus={clearHint}>
                            {`${$L('Latest')} ${shortEpisode(lastContent)}`}
                        </PillButton>
                    }
                    <PillButton round
                        icon={isInWatchlist ? 'check' : 'plus'}
                        aria-label={isInWatchlist ? $L('Remove from my list') : $L('Add to my list')}
                        onClick={toggleWatchlist}
                        onFocus={showHint} />
                    <PillButton round icon='bubble'
                        aria-label={$L('Audio and Subtitles')}
                        onClick={onAudio}
                        onFocus={showHint} />
                    <PillButton round icon='grid'
                        aria-label={$L('Similar')}
                        selected={shelf === 'similar'}
                        onClick={showSimilar}
                        onFocus={showHint} />
                    <PillButton round icon='note'
                        aria-label={$L('Music')}
                        selected={shelf === 'music'}
                        onClick={showMusic}
                        onFocus={showHint} />
                    {content.type === 'series' &&
                        <PillButton round icon='checkCircle'
                            aria-label={$L('Mark as watched')}
                            onClick={markAsWatched}
                            onFocus={showHint} />
                    }
                    <div className={css.stars}>
                        {Array.from({ length: 5 }, (_v, i) =>
                            <PillButton small round plain key={i}
                                className={i < rating ? css.starOn : null}
                                icon={i < rating ? 'star' : 'starOutline'}
                                data-star={i}
                                aria-label={`${$L('Rate')} ${i + 1}/5`}
                                onClick={updateRating}
                                onFocus={showHint} />
                        )}
                    </div>
                    <div className={css.hint}>
                        {hint ||
                            (resume &&
                                <span className={css.resume}>
                                    <span className={css.resumeBar}><i style={{ width: `${progress}%` }} /></span>
                                    {resume}
                                </span>
                            )
                        }
                    </div>
                </div>
            }
            <PopupMessage show={!!(message?.type)} type={message?.type}>
                {message?.message || 'nothing'}
            </PopupMessage>
        </div>
    )
}

DetailActions.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
    setContent: PropTypes.func.isRequired,
    shelf: PropTypes.string.isRequired,
    onShelf: PropTypes.func.isRequired,
    onAudio: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
}

export default DetailActions
