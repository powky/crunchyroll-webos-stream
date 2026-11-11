/**
 * Pictures downloaded ahead of time, so the artwork of what's next to the focus is already here when the focus gets
 * there. They go to the browser's cache (the CDN lets it keep them a day). The nearest ones are also decoded and
 * held: showing a held picture costs ~25 ms on this TV instead of ~250 ms for decoding a 1440p one.
 */

/** pictures known to be in the cache: downloaded here, or shown */
const ready = new Set()
/** downloads running */
const loading = new Set()
/** what's still wanted, most important first */
let queue = []
/** two at a time: the API and what's on screen go first */
const MAX_PARALLEL = 2
/** pictures to keep decoded (each 1440p one is ~15 MB of memory) */
let wantDecoded = new Set()
/** decoded pictures held, by url */
const decoded = new Map()

/**
 * Decode a downloaded picture and hold it while it's still wanted
 * @param {String} url
 * @param {HTMLImageElement} [img] the one that downloaded it
 */
const holdDecoded = (url, img) => {
    if (decoded.has(url) || !wantDecoded.has(url)) {
        return
    }
    if (!img) {
        img = new window.Image()
        img.src = url
    }
    if (img.decode) {
        img.decode().then(() => {
            if (wantDecoded.has(url)) {
                decoded.set(url, img)
            }
        }, () => {})
    }
}

const next = () => {
    while (loading.size < MAX_PARALLEL && queue.length) {
        const url = queue.shift()
        const img = new window.Image()
        const done = (ok) => {
            loading.delete(url)
            if (ok) {
                ready.add(url)
                holdDecoded(url, img)
            }
            next()
        }
        loading.add(url)
        img.onload = () => done(true)
        img.onerror = () => done(false)
        img.src = url
    }
}

/**
 * @param {String} url
 * @returns {Boolean} already downloaded
 */
export const isReady = (url) => !!url && ready.has(url)

/** @param {String} url a picture that's been shown */
export const markReady = (url) => {
    if (url) {
        ready.add(url)
    }
}

/**
 * Download these next, replacing what was asked before (only what's near the focus now is worth the network);
 * downloads already running finish
 * @param {Array<String>} urls most important first
 * @param {Array<String>} [toDecode] the few of them to keep decoded too; pictures held before and not in it are let go
 */
export const preload = (urls, toDecode = []) => {
    wantDecoded = new Set(toDecode.filter(Boolean))
    decoded.forEach((_img, url) => {
        if (!wantDecoded.has(url)) {
            decoded.delete(url)
        }
    })
    wantDecoded.forEach(url => {
        if (ready.has(url)) {
            holdDecoded(url)
        }
    })
    queue = [...new Set(urls)].filter(url => url && !ready.has(url) && !loading.has(url))
    next()
}
