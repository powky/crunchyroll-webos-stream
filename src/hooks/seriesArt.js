import api from '../api'

/** the keyart a hero uses; the rest of images_localized isn't kept */
const KEYS = ['hero_background', 'tile_artwork', 'content_logo_polychromatic']
const STORE_KEY = 'crunchy_seriesArt'
/** keyart rarely changes: two weeks before asking again */
const MAX_AGE = 14 * 24 * 60 * 60 * 1000
const MAX_ITEMS = 1500
/** ids per request: the API takes a list, and one request per row beats one per card */
const BATCH = 40

/**
 * Keyart found so far, kept between launches so a hero can show its art without waiting for the API.
 * Saved per content language: logos are localized.
 * @type {{lang: String, items: Object<String, {t: Number, i: Object}>}}
 */
let store = null
/** series id -> Promise of its art object (or null), while asked or known */
const pending = new Map()
let saveTimer = null

const loadStore = (lang) => {
    if (store && store.lang === lang) {
        return store
    }
    store = { lang, items: {} }
    pending.clear()
    try {
        const saved = JSON.parse(window.localStorage.getItem(STORE_KEY))
        if (saved && saved.lang === lang && saved.items) {
            const now = Date.now()
            Object.entries(saved.items).forEach(([id, entry]) => {
                if (now - entry.t < MAX_AGE) {
                    store.items[id] = entry
                }
            })
        }
    } catch (_e) {
        // nothing saved, or unreadable: start over
    }
    return store
}

const saveStore = () => {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        const entries = Object.entries(store.items)
        if (entries.length > MAX_ITEMS) {  // drop the oldest
            entries.sort((a, b) => b[1].t - a[1].t)
            store.items = Object.fromEntries(entries.slice(0, MAX_ITEMS))
        }
        try {
            window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
        } catch (_e) {
            // full: it still works from memory
        }
    }, 2000)
}

/**
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @returns {String}
 */
const getLang = (profile) => (profile && profile.preferred_communication_language) || ''

/**
 * Whose keyart a content uses: its series for an episode, itself for a series or movie listing
 * @param {Object} content
 * @returns {String|null}
 */
const getSeriesId = (content) => {
    if (!content) {
        return null
    }
    if (content.type === 'episode') {
        return (content.episode_metadata && content.episode_metadata.series_id) || content.series_id || null
    }
    return ['series', 'movie_listing'].includes(content.type) ? content.id : null
}

/**
 * @param {String} id
 * @param {Object} images what the API gave, possibly nothing
 * @returns {Object|null} an object pickHeroBackdrop and pickLogo understand
 */
const toArt = (id, images) => (images && Object.keys(images).length ? { id, images_localized: images } : null)

/**
 * @param {Object} imagesLocalized
 * @returns {Object}
 */
const pickKeys = (imagesLocalized) => {
    const out = {}
    KEYS.forEach(key => {
        if (imagesLocalized && imagesLocalized[key] && imagesLocalized[key].url) {
            out[key] = { url: imagesLocalized[key].url }
        }
    })
    return out
}

/**
 * Ask the API for the keyart of several series at once
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Array<String>} ids
 */
const fetchArt = (profile, ids) => {
    const current = store
    const request = api.cms.getObjects(profile, { objectIds: ids, ratings: false }).then(res => {
        const found = {}
        const data = (res && res.data) || []
        data.forEach(obj => { found[obj.id] = pickKeys(obj.images_localized) })
        if (current === store) {
            const now = Date.now()
            ids.forEach(id => { store.items[id] = { t: now, i: found[id] || {} } })  // none is an answer too
            saveStore()
        }
        return found
    })
    ids.forEach(id => {
        pending.set(id, request.then(found => toArt(id, found[id]), () => {
            pending.delete(id)  // try again next time
            return null
        }))
    })
}

/**
 * Keyart already known for a content, without waiting
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} content
 * @returns {Object|null|undefined} the art, null when it has none, undefined when not known yet
 */
export const getKnownArt = (profile, content) => {
    if (content && content.images_localized) {
        return content
    }
    const id = getSeriesId(content)
    if (!id) {
        return null
    }
    const entry = loadStore(getLang(profile)).items[id]
    return entry ? toArt(id, entry.i) : undefined
}

/**
 * Fetch, in a few requests, the keyart of contents that may be shown soon (a row that just loaded)
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Array<Object>} contents
 */
export const prefetchArt = (profile, contents) => {
    if (!profile || !contents) {
        return
    }
    const known = loadStore(getLang(profile)).items
    const ids = [...new Set(contents.map(getSeriesId).filter(id => id && !known[id] && !pending.has(id)))]
    for (let i = 0; i < ids.length; i += BATCH) {
        fetchArt(profile, ids.slice(i, i + BATCH))
    }
}

/**
 * The content whose art a hero should use (hero background, title logo): the series for an episode, the content
 * itself when it already has its keyart. Answers from what's stored when it can.
 * @param {import('crunchyroll-js-api').Types.Profile} profile
 * @param {Object} content
 * @returns {Promise<Object>}
 */
export const getArtContent = async (profile, content) => {
    const known = getKnownArt(profile, content)
    if (known !== undefined) {
        return known || content
    }
    const id = getSeriesId(content)
    if (!pending.has(id)) {
        fetchArt(profile, [id])
    }
    return (await pending.get(id)) || content
}

/** the art language follows the profile's: forget what was fetched in the old one */
export const clearSeriesArt = () => {
    store = null
    pending.clear()
    try {
        window.localStorage.removeItem(STORE_KEY)
    } catch (_e) {
        // nothing to remove
    }
}
