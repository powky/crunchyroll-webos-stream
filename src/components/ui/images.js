import emptyImg from '../../../assets/img/empty.jpg'

/** which image sets to try, in order, for each kind of picture */
const ORDER = {
    wide: ['poster_wide', 'thumbnail', 'poster_tall'],
    thumb: ['thumbnail', 'poster_wide', 'poster_tall'],
    tall: ['poster_tall', 'poster_wide', 'thumbnail'],
}

/**
 * @param {Array} list
 * @returns {Array<{width: Number, height: Number, source: String}>}
 */
const flatten = (list) => {
    if (!list || !list.length) {
        return []
    }
    return Array.isArray(list[0]) ? list[0] : list
}

/**
 * Smallest picture at least `minWidth` CSS px wide (or the biggest there is), so cards stay sharp at the TV's 2x
 * without decoding full-size artwork for every tile
 * @param {Object} content
 * @param {Object} [obj]
 * @param {'wide'|'thumb'|'tall'} [obj.mode]
 * @param {Number} [obj.minWidth]
 * @returns {String}
 */
export const pickImage = (content, { mode = 'wide', minWidth = 640 } = {}) => {
    const images = content && content.images
    if (images) {
        for (const key of ORDER[mode] || ORDER.wide) {
            const list = flatten(images[key]).slice().sort((a, b) => a.width - b.width)
            if (list.length) {
                const found = list.find(img => img.width >= minWidth) || list[list.length - 1]
                return found.source
            }
        }
    }
    return emptyImg
}

/**
 * Artwork for a full-screen backdrop
 * @param {Object} content
 * @returns {String|null}
 */
export const pickBackdrop = (content) => {
    if (!content || !content.images) {
        return null
    }
    const mode = content.images.poster_wide ? 'wide' : 'thumb'
    return pickImage(content, { mode, minWidth: 1600 })
}

export { emptyImg }

/**
 * A keyart picture from `images_localized` (the API's templated imgsrv links), at the size asked for
 * @param {Object} content
 * @param {String} key e.g. hero_background, content_logo_polychromatic
 * @param {String} params imgsrv options, e.g. 'fit=cover,width=1920'
 * @returns {String|null}
 */
export const localizedImage = (content, key, params) => {
    const image = content && content.images_localized && content.images_localized[key]
    if (!image || !image.url) {
        return null
    }
    return image.url.replace('{:param}', `${params},format=auto,quality=85`)
}

/**
 * Show art made for a hero (room for text on the left); null when the API has none
 * @param {Object} content
 * @param {Number} [width] 3840 by default: 4K for the TV's 2x screen; ask for a small one to show while that loads
 * @returns {String|null}
 */
export const pickHeroBackdrop = (content, width = 3840) => {
    const size = `fit=cover,width=${width},height=${Math.round(width * 9 / 16)}`
    return localizedImage(content, 'hero_background', size) || localizedImage(content, 'tile_artwork', size)
}

/**
 * The show's own title logo (transparent), in the profile's language when Crunchyroll has one
 * @param {Object} content
 * @returns {String|null}
 */
export const pickLogo = (content) => (
    // trim=border crops the logo's transparent margins, so it lines up with the text under it
    localizedImage(content, 'content_logo_polychromatic', 'fit=contain,width=1400,trim=border')
)
