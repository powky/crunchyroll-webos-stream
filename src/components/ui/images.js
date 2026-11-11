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
