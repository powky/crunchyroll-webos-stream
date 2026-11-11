import { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import { $L } from '../../hooks/language'
import { getDuration, isPlayable } from '../../utils'
import css from './HeroInfo.module.less'


/**
 * @param {Object} content
 * @returns {Object}
 */
const getMetadata = (content) => (
    content.episode_metadata || content.series_metadata || content.movie_listing_metadata || content.movie_metadata || {}
)

/**
 * Small caps line above the title
 * @param {Object} content
 * @returns {String}
 */
export const getEyebrow = (content) => {
    const parts = []
    if (content.type === 'series') {
        parts.push($L('Series'))
    } else if (content.type === 'movie_listing' || content.type === 'movie') {
        parts.push($L('Movie'))
    } else if (content.type === 'episode') {
        parts.push($L('Episode'))
    } else if (content.type === 'musicArtist') {
        parts.push($L('Artist'))
    } else if (content.type === 'musicVideo' || content.type === 'musicConcert') {
        parts.push($L('Music'))
    }
    const metadata = getMetadata(content)
    if (metadata.is_simulcast) {
        parts.push($L('Simulcast'))
    }
    return parts.join(' · ')
}

/**
 * "T1 · E5 — title" for an episode, the plain subtitle otherwise
 * @param {Object} content
 * @returns {String}
 */
export const getEpisodeLabel = (content) => {
    const metadata = content.episode_metadata || content
    const season = metadata.season_number != null ? metadata.season_number : metadata.season_sequence_number
    const episode = metadata.episode_number != null ? metadata.episode_number : metadata.episode
    const name = content.subTitle || (content.episode_metadata ? content.title : null)
    const parts = []
    if (season != null) {
        parts.push(`${$L('S')}${season}`)
    }
    if (episode != null && episode !== '') {
        parts.push(`${$L('E')}${episode}`)
    }
    let out = parts.join(' · ')
    if (name) {
        out = out ? `${out} — ${name}` : name
    }
    return out
}

/**
 * Pieces of the metadata line
 * @param {Object} content
 * @returns {{maturity: String, parts: Array<String>, rating: String}}
 */
export const getMetaParts = (content) => {
    const metadata = getMetadata(content)
    const parts = []
    let year = metadata.series_launch_year || metadata.movie_release_year
    if (!year && metadata.episode_air_date) {
        year = metadata.episode_air_date.split('-')[0]
    }
    if (!year && content.publishDate) {
        year = content.publishDate.split('-')[0]
    }
    if (year) {
        parts.push(`${year}`)
    }
    if (metadata.season_count) {
        parts.push(`${metadata.season_count} ${metadata.season_count === 1 ? $L('Season') : $L('Seasons')}`.toLowerCase())
    }
    if (metadata.episode_count) {
        parts.push(`${metadata.episode_count} ${$L('Episodes')}`.toLowerCase())
    }
    if (isPlayable(content.type)) {
        const duration = getDuration(content)
        if (duration) {
            parts.push(`${Math.max(1, Math.round(duration / 60000))} min`)
        }
    }
    const langs = []
    if (metadata.is_subbed) {
        langs.push($L('Sub'))
    }
    if (metadata.is_dubbed) {
        langs.push($L('Dub'))
    }
    if (langs.length) {
        parts.push(langs.join(' | '))
    }
    if (content.genres && content.genres.length) {
        parts.push(content.genres.map(val => val.displayValue).join(', '))
    }
    const maturity = (metadata.maturity_ratings && metadata.maturity_ratings[0]) || null
    let rating = null
    if (content.rating && content.rating.average) {
        rating = `${content.rating.average}`.replace('.', ',')
    }
    return { maturity, parts, rating }
}

/**
 * The show's title logo, or its name as text when there's no logo or it doesn't load
 * @param {Object} obj
 * @param {String} [obj.logo]
 * @param {String} obj.title
 */
const Title = ({ logo, logoPending, title }) => {
    const [failed, setFailed] = useState(false)
    const onError = useCallback(() => setFailed(true), [])
    useEffect(() => setFailed(false), [logo])
    if (logoPending) {
        return <div className={css.logoTitle} />
    }
    if (logo && !failed) {
        return (
            <h1 className={css.logoTitle}>
                <img className={css.logo} src={logo} alt={title} onError={onError} />
            </h1>
        )
    }
    return <h1 className={css.title}>{title}</h1>
}

/**
 * Title, metadata and synopsis of a show, over its backdrop
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {'home'|'detail'|'compact'} [obj.size]
 * @param {String} [obj.eyebrow] overrides the computed one
 * @param {Number} [obj.lines] synopsis lines
 * @param {String} [obj.logo] title logo picture, shown instead of the title text
 * @param {Boolean} [obj.logoPending] the logo is still being looked up: keep its room empty, no text in between
 * @param {React.ReactNode} [obj.children] shown below (progress, buttons)
 */
const HeroInfo = ({ content, size = 'home', eyebrow, lines = 3, logo, logoPending, className, children }) => {
    const { maturity, parts, rating } = getMetaParts(content)
    const top = eyebrow != null ? eyebrow : getEyebrow(content)
    const isEpisode = content.type === 'episode'
    const title = content.title || content.name || ''
    const subtitle = isEpisode ? getEpisodeLabel(content) : (content.subTitle || '')
    const description = content.description || ''

    return (
        <div className={classNames(css.hero, css[size], className)}>
            {top && <div className={css.eyebrow}>{top}</div>}
            <Title logo={logo} logoPending={logoPending} title={title} />
            {subtitle && subtitle !== title && <div className={css.subtitle}>{subtitle}</div>}
            {(maturity || parts.length > 0 || rating) &&
                <div className={css.meta}>
                    {maturity && <span className={css.chip}>{maturity}</span>}
                    {parts.map((part, index) => (
                        <span key={index} className={css.part}>
                            {(index > 0 || maturity) && <i className={css.sep} />}
                            {part}
                        </span>
                    ))}
                    {rating &&
                        <span className={css.part}>
                            <i className={css.sep} />
                            <span className={css.star}>★ {rating}</span>
                        </span>
                    }
                </div>
            }
            {description &&
                <div className={css.description} style={{ WebkitLineClamp: lines }}>{description}</div>
            }
            {children}
        </div>
    )
}

HeroInfo.propTypes = {
    content: PropTypes.object.isRequired,
    size: PropTypes.oneOf(['home', 'detail', 'compact']),
    eyebrow: PropTypes.string,
    lines: PropTypes.number,
    logo: PropTypes.string,
    logoPending: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
}

export default HeroInfo
