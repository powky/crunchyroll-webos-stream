import { useEffect, useState } from 'react'

/**
 * Pictures kept for good in IndexedDB (profile avatars: an avatar's file never changes, only which one a profile
 * uses). Each is downloaded once and then served from the TV as a blob URL.
 */

const DB_NAME = 'crunchy-images'
const STORE = 'images'

/** url -> Promise of the url to show (a blob URL, or the original when storing failed) */
const urls = new Map()
/** url -> what's ready to show now, so a remount paints it at once */
const shown = new Map()
/** @type {Promise<IDBDatabase>} */
let dbPromise = null

/** @returns {Promise<IDBDatabase>} */
const openDb = () => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            const req = window.indexedDB.open(DB_NAME, 1)
            req.onupgradeneeded = () => req.result.createObjectStore(STORE)
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
        dbPromise.catch(() => { dbPromise = null })
    }
    return dbPromise
}

/**
 * @param {IDBDatabase} db
 * @param {'readonly'|'readwrite'} mode
 * @param {Function} fn gets the store, returns a request
 * @returns {Promise}
 */
const run = (db, mode, fn) => new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
})

/**
 * @param {String} url
 * @returns {Promise<String>} a URL for the stored copy
 */
export const getStoredImage = (url) => {
    if (!urls.has(url)) {
        urls.set(url, (async () => {
            let out = url
            try {
                const db = await openDb()
                let blob = await run(db, 'readonly', store => store.get(url))
                if (!blob) {
                    const res = await window.fetch(url)
                    if (!res.ok) {
                        throw new Error(`${res.status}`)
                    }
                    blob = await res.blob()
                    await run(db, 'readwrite', store => store.put(blob, url))
                }
                out = URL.createObjectURL(blob)
            } catch (_e) {
                urls.delete(url)  // the network copy works too; try storing it again next time
            }
            shown.set(url, out)
            return out
        })())
    }
    return urls.get(url)
}

/**
 * @param {String} url
 * @returns {String} what to show for the picture: its stored copy once read (empty for a moment the first time)
 */
export const useStoredImage = (url) => {
    const [src, setSrc] = useState(() => (url ? shown.get(url) || '' : ''))

    useEffect(() => {
        let active = true
        if (url) {
            setSrc(shown.get(url) || '')
            getStoredImage(url).then(found => active && setSrc(found))
        } else {
            setSrc('')
        }
        return () => { active = false }
    }, [url])

    return src
}
