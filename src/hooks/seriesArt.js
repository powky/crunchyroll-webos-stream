import api from '../api'

/** object id -> Promise of the object with its keyart: an episode's hero borrows its show's artwork and logo */
const cache = new Map()

/**
 * The content whose art a hero should use (hero background, title logo): the series for an episode, the content
 * itself when it already has its keyart, or the same object fetched again when it came without it (lists, search)
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
export const getArtContent = async (profile, content) => {
    if (!content || content.images_localized || !profile) {
        return content
    }
    let seriesId = null
    if (content.type === 'episode') {
        seriesId = (content.episode_metadata && content.episode_metadata.series_id) || content.series_id
    } else if (['series', 'movie_listing'].includes(content.type)) {
        seriesId = content.id
    }
    if (!seriesId) {
        return content
    }
    if (!cache.has(seriesId)) {
        cache.set(seriesId, api.cms.getObjects(profile, { objectIds: [seriesId], ratings: true })
            .then(res => (res && res.data && res.data[0]) || null)
            .catch(() => {
                cache.delete(seriesId)
                return null
            }))
    }
    return (await cache.get(seriesId)) || content
}

/** the art language follows the profile's: forget what was fetched in the old one */
export const clearSeriesArt = () => cache.clear()
