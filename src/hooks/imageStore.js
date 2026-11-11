import { useEffect, useState } from 'react'

/**
 * Pictures kept on the TV in IndexedDB: card thumbnails, backdrops, title logos and avatars download once and are
 * served from the TV afterwards, across launches (the CDN only lets the browser keep them a day). Shown as blob URLs.
 * The oldest pictures not used lately go when the store grows past its limits.
 */

const DB_NAME = 'crunchy-images'
const DB_VERSION = 2
const STORE = 'images'
/** how much to keep: thumbnails are ~50 KB, backdrops ~600 KB */
const MAX_BYTES = 200 * 1024 * 1024
const MAX_ITEMS = 4000
/** a picture's last use is written down at most this often (each write costs a transaction) */
const TOUCH_EVERY = 24 * 60 * 60 * 1000
/** blob URLs kept alive in this session; the oldest are released past it */
const MAX_URLS = 600
/** imgsrv answers format=auto with WebP only to clients that say they take it (a plain fetch got 2 MB PNGs) */
const ACCEPT = 'image/webp,image/apng,image/*,*/*;q=0.8'

/** url -> Promise of the url to show (a blob URL, or the original when storing failed) */
const urls = new Map()
/** url -> what's ready to show now, so a remount paints it at once; in order of use */
const shown = new Map()
/** @type {Promise<IDBDatabase>} */
let dbPromise = null
let trimmed = false

/**
 * @param {IDBRequest} req
 * @returns {Promise}
 */
const done = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
})

/** drop the least recently used pictures past the limits; once per launch, after the first screens are up */
const trim = (db) => {
    const index = db.transaction(STORE, 'readwrite').objectStore(STORE).index('t')
    const cursorReq = index.openCursor(null, 'prev')  // newest first
    let bytes = 0
    let count = 0
    cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
            bytes += (cursor.value.blob && cursor.value.blob.size) || 0
            count++
            if (bytes > MAX_BYTES || count > MAX_ITEMS) {
                cursor.delete()
            }
            cursor.continue()
        }
    }
}

/** @returns {Promise<IDBDatabase>} */
const openDb = () => {
    if (!dbPromise) {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (db.objectStoreNames.contains(STORE)) {  // version 1 kept bare blobs without dates
                db.deleteObjectStore(STORE)
            }
            db.createObjectStore(STORE).createIndex('t', 't')
        }
        dbPromise = done(req)
        dbPromise.then(db => {
            if (!trimmed) {
                trimmed = true
                setTimeout(() => trim(db), 20 * 1000)
            }
        }, () => { dbPromise = null })
    }
    return dbPromise
}

/**
 * @param {String} url
 * @param {String} src
 */
const remember = (url, src) => {
    shown.delete(url)
    shown.set(url, src)
    if (shown.size > MAX_URLS) {
        const [oldUrl, oldSrc] = shown.entries().next().value
        shown.delete(oldUrl)
        urls.delete(oldUrl)
        if (oldSrc.startsWith('blob:')) {
            URL.revokeObjectURL(oldSrc)
        }
    }
}

/**
 * @param {String} url
 * @returns {Promise<String>} a URL for the stored copy (the original for local files, or when storing fails)
 */
export const getStoredImage = (url) => {
    if (!url || !/^https?:/.test(url)) {
        return Promise.resolve(url)
    }
    if (!urls.has(url)) {
        urls.set(url, (async () => {
            let out = url
            try {
                const db = await openDb()
                const store = mode => db.transaction(STORE, mode).objectStore(STORE)
                const saved = await done(store('readonly').get(url))
                let blob = saved && saved.blob
                const now = Date.now()
                if (!blob) {
                    const res = await window.fetch(url, { headers: { Accept: ACCEPT } })
                    if (!res.ok) {
                        throw new Error(`${res.status}`)
                    }
                    blob = await res.blob()
                    store('readwrite').put({ blob, t: now }, url)
                } else if (now - saved.t > TOUCH_EVERY) {
                    store('readwrite').put({ blob, t: now }, url)
                }
                out = URL.createObjectURL(blob)
            } catch (_e) {
                urls.delete(url)  // the network copy works too; try storing it again next time
                return url
            }
            remember(url, out)
            return out
        })())
    }
    return urls.get(url)
}

/**
 * @param {String} url
 * @returns {String|undefined} the stored copy's URL when it's already been read in this session
 */
export const peekStoredImage = (url) => {
    if (url && !/^https?:/.test(url)) {
        return url
    }
    return shown.get(url)
}

/**
 * @param {String} url
 * @returns {String} what to show for the picture: its stored copy once read (empty for a moment the first time)
 */
export const useStoredImage = (url) => {
    const [src, setSrc] = useState(() => peekStoredImage(url) || '')

    useEffect(() => {
        let active = true
        const known = peekStoredImage(url)
        setSrc(known || '')
        if (url && !known) {
            getStoredImage(url).then(found => active && setSrc(found))
        }
        return () => { active = false }
    }, [url])

    return src
}
