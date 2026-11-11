
import Locale from 'ilib/lib/Locale'
import { localStore, api, config } from 'crunchyroll-js-api'
import { LOAD_MOCK_DATA } from '../const'
import { getMockData } from '../mock-data/mockData'
import { translateError } from './utils'


/**
 * Return avatar list
 * @param {String} [lang]
 * @returns {Promise<Array<import('crunchyroll-js-api').Types.AssesItem>>}
 */
export const getAvatarList = async (lang) => {
    if (!lang) {
        const locale = new Locale()
        lang = locale.getSpec()
    }
    /** @type {{items: Array<import('crunchyroll-js-api').Types.AssesItem>}} */
    let avatarList = null
    try {
        if (LOAD_MOCK_DATA) {
            avatarList = await getMockData('avatars')
        } else {
            avatarList = await api.assets.getAvatar({
                token: await localStore.getAuthToken(),
                lang
            })
        }
    } catch (error) {
        await translateError(error)
    }
    return avatarList.items
}

/**
 * Return avatar url
 * @param {String} avatar
 * @param {'510x510'|'170x170'} [size] the big one for a profile's own picture (sharp on a 4K screen), the small one
 *     for long lists to pick from
 * @returns {String}
 */
export const getAvatarUrl = (avatar, size = '510x510') => `${config.urlStatic}/assets/avatar/${size}/${avatar}`


/**
 * Return avatar list
 * @param {String} [lang]
 * @returns {Promise<Array<import('crunchyroll-js-api').Types.AssesItem>>}
 */
export const getWallpaper = async (lang) => {
    if (!lang) {
        const locale = new Locale()
        lang = locale.getSpec()
    }
    /** @type {{items: Array<import('crunchyroll-js-api').Types.AssesItem>}} */
    let wallpaperList = null
    try {
        if (LOAD_MOCK_DATA) {
            wallpaperList = await getMockData('wallpapers')
        } else {
            wallpaperList = await api.assets.getAvatar({
                token: await localStore.getAuthToken(),
                lang
            })
        }
    } catch (error) {
        await translateError(error)
    }
    return wallpaperList.items
}
