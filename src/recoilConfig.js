
import { atom } from 'recoil'


const localStorageEffect = atomKey => ({ setSelf, onSet }) => {
    const key = `crunchy_${atomKey}`
    const savedValue = window.localStorage.getItem(key)
    if (savedValue != null) {
        setSelf(JSON.parse(savedValue))
    }

    onSet((newValue, _, isReset) => {
        if (isReset) {
            window.localStorage.removeItem(key)
        } else {
            window.localStorage.setItem(key, JSON.stringify(newValue))
        }
    })
}


export const pathState = atom({
    key: 'pathSate',
    default: '/init'
})

export const initScreenState = atom({
    key: 'initScreenState',
    default: '/init'
})

export const currentProfileState = atom({
    key: 'currentProfileState',
    default: null
})

export const autoLoginState = atom({
    key: 'autoLoginState',
    default: true
})

export const selectedContentState = atom({
    key: 'selectedContentState',
    default: null
})

export const homeViewReadyState = atom({
    key: 'homeViewReadyState',
    default: false
})

export const playContentState = atom({
    key: 'playContentState',
    default: null
})

export const contactBtnState = atom({
    key: 'contactBtnState',
    default: false
})

export const categoriesState = atom({
    key: 'categoriesState',
    default: [],
    effects: [localStorageEffect('categoriesState')]
})

export const isPremiumState = atom({
    key: 'isPremiumState',
    default: false
})

export const viewBackupState = atom({
    key: 'viewBackupState',
    default: {}
})

/** UI language: 'auto' follows the TV, otherwise a locale such as 'es-ES' (index.js hands it to Enact's i18n) */
export const uiLanguageState = atom({
    key: 'uiLanguageState',
    default: 'auto',
    effects: [localStorageEffect('uiLanguage')]
})

/** tabs of the top bar the user chose to hide (by key: simulcast, series, movies, musics, my_list) */
export const hiddenTabsState = atom({
    key: 'hiddenTabsState',
    default: [],
    effects: [localStorageEffect('hiddenTabs')]
})

/** the top bar's clock: '24' or '12' (with a.m. / p.m.) */
export const clockFormatState = atom({
    key: 'clockFormatState',
    default: '24',
    effects: [localStorageEffect('clockFormat')]
})
