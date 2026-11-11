import { useState, useCallback, useMemo, useEffect } from 'react'
import { Panel } from '@enact/moonstone/Panels'
import classNames from 'classnames'
import { useRecoilState } from 'recoil'

import Alert from '../components/Alert'
import PopupMessage from '../components/Popup'
import Icon from '../components/ui/Icons'
import SettingsList from '../components/settings/SettingsList'
import css from '../components/settings/Settings.module.less'

import { $L, useMapLang } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import { useSaveOneProfileField } from '../hooks/profile'
import { initCache } from '../hooks/customFetch'
import { syncFonts, getFonts } from '../hooks/fonts'
import { currentProfileState, uiLanguageState, hiddenTabsState, clockFormatState } from '../recoilConfig'
import api from '../api'
import { clearSeriesArt } from '../hooks/seriesArt'

/** UI languages the app has strings for (resources/), named in their own language */
const UI_LANGUAGES = [
    { value: 'es-ES', label: 'Español' },
    { value: 'en-US', label: 'English' },
    { value: 'pt-BR', label: 'Português' },
    { value: 'fr-FR', label: 'Français' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'it-IT', label: 'Italiano' },
    { value: 'ru-RU', label: 'Русский' },
    { value: 'ar-SA', label: 'العربية' },
    { value: 'hi-IN', label: 'हिन्दी' },
]

/**
 * @param {Object} obj
 * @param {Function} obj.setAppConfig
 * @param {String} obj.field
 * @returns {Function}
 */
const useSaveConfigField = ({ setAppConfig, field }) => {
    return useCallback(value => {
        setAppConfig(p => {
            return { ...p, [field]: value }
        })
        api.config.setAppConfig({ [field]: value })
    }, [setAppConfig, field])
}

/**
 * Settings, tvOS style: grouped rows with their value on the right; rows with options drill into a list
 * @param {Object} obj
 * @param {Boolean} [obj.noButtons] shown as a tab of the home screen (not as its own screen)
 */
const AppConfigPanel = ({ noButtons, ...rest }) => {
    const { goTo, jumpTo } = useNavigate()
    const [appConfig, setAppConfig] = useState(api.config.getAppConfig())
    const [isLogged, setIsLogged] = useState(false)
    const [loadingFonts, setLoadingFonts] = useState(false)
    /** @type {[{type: String, message: String}, Function]}  */
    const [message, setMessage] = useState(null)
    const [fontList, setFontList] = useState([])
    const [askLogout, setAskLogout] = useState(false)
    const [language, setLanguage] = useRecoilState(uiLanguageState)
    /** @type {[Array<String>, Function]} */
    const [hiddenTabs, setHiddenTabs] = useRecoilState(hiddenTabsState)
    /** @type {['24'|'12', Function]} */
    const [clockFormat, setClockFormat] = useRecoilState(clockFormatState)
    const [profile, setProfile] = useRecoilState(currentProfileState)
    /** @type {[{content: Array, audio: Array, subtitle: Array}, Function]} */
    const [profileLangs, setProfileLangs] = useState(null)
    const mapLang = useMapLang()

    const saveUI = useSaveConfigField({ setAppConfig, field: 'ui' })
    const savePreview = useSaveConfigField({ setAppConfig, field: 'preview' })
    const saveSubtitle = useSaveConfigField({ setAppConfig, field: 'subtitle' })
    const saveVideo = useSaveConfigField({ setAppConfig, field: 'video' })
    const saveHomeFirst = useSaveConfigField({ setAppConfig, field: 'homeFirst' })
    const saveCacheField = useSaveConfigField({ setAppConfig, field: 'cacheMemory' })
    const saveCache = useCallback(value => {
        saveCacheField(value)
        initCache()
    }, [saveCacheField])

    const saveContentLangField = useSaveOneProfileField({ profile, setProfile, field: 'preferred_communication_language' })
    const saveAudioLangField = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_audio_language' })
    const saveSubtitleLangField = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_subtitle_language' })
    /** a profile field is saved on Crunchyroll's side: a failure is shown, not left to crash the app */
    const showSaveError = useCallback(err => {
        setMessage({ type: 'error', message: (err && err.message) || $L('An error occurred') })
        setTimeout(() => setMessage(null), 3000)
    }, [])
    /** titles and synopses come in this language: what's cached was fetched in the old one */
    const saveContentLang = useCallback(value => {
        saveContentLangField(value).then(() => {
            api.utils.clearCache()
            clearSeriesArt()
        }).catch(showSaveError)
    }, [saveContentLangField, showSaveError])
    const saveAudioLang = useCallback(value => {
        saveAudioLangField(value).catch(showSaveError)
    }, [saveAudioLangField, showSaveError])
    const saveSubtitleLang = useCallback(value => {
        saveSubtitleLangField(value).catch(showSaveError)
    }, [saveSubtitleLangField, showSaveError])

    const doSyncFonts = useCallback(async () => {
        setLoadingFonts(true)
        syncFonts()
            .then(() => getFonts())
            .then(fontsData => {
                setMessage({ type: 'info', message: 'Okey' })
                setFontList(fontsData.names)
                setTimeout(() => setMessage(null), 1500)
            }).catch(err => {
                console.error(err)
                if (err) {
                    setMessage({ type: 'error', message: err.message || `${err}` })
                } else {
                    setMessage({ type: 'error', message: $L('An error occurred') })
                }
            }).finally(() => setLoadingFonts(false))
    }, [setMessage, setLoadingFonts])

    const doLogout = useCallback(async () => {
        setAskLogout(false)
        await api.auth.logout()
        api.utils.clearCache()
        jumpTo('/login')
    }, [jumpTo])
    const cancelLogout = useCallback(() => setAskLogout(false), [])
    const openLogout = useCallback(() => setAskLogout(true), [])
    const openAbout = useCallback(() => goTo('/contact'), [goTo])
    const openDeveloper = useCallback(() => goTo('/developer'), [goTo])

    useEffect(() => {
        getFonts().then(fontsData => setFontList(fontsData.names))
    }, [setFontList])

    useEffect(() => {
        api.auth.getSession().then(token => setIsLogged(!!token))
    }, [])

    useEffect(() => {
        if (profile && profile.profile_id) {
            Promise.all([
                api.misc.getContentLangList(),
                api.misc.getAudioLangList(),
                api.misc.getSubtitleLangList(),
            ]).then(([content, audio, subtitle]) => {
                const toOptions = list => list.map(mapLang).map(lang => ({ value: lang.key, label: lang.children }))
                setProfileLangs({ content: toOptions(content), audio: toOptions(audio), subtitle: toOptions(subtitle) })
            }).catch(() => setProfileLangs(null))
        }
    }, [profile, mapLang, language])

    /** a top bar tab shown or hidden */
    const setTabShown = useCallback((key, value) => {
        setHiddenTabs(old => (value === 'hide' ? [...old.filter(k => k !== key), key] : old.filter(k => k !== key)))
    }, [setHiddenTabs])

    const sections = useMemo(() => {
        const out = [{
            title: $L('Playback'),
            rows: [{
                key: 'video', icon: 'tv', label: $L('Video quality'), value: appConfig.video, onChange: saveVideo,
                options: [
                    { value: 'adaptive', label: $L('Automatic') },
                    { value: '2160p', label: '4K (2160p)' },
                    { value: '1080p', label: 'Full HD (1080p)' },
                    { value: '720p', label: 'HD (720p)' },
                    { value: '480p', label: 'SD (480p)' },
                    { value: '360p', label: '360p' },
                    { value: '240p', label: '240p' },
                ],
            }, {
                key: 'subtitle', icon: 'bubble', label: $L('Subtitles'), value: appConfig.subtitle, onChange: saveSubtitle,
                options: [
                    { value: 'hardsub', label: $L('Burned into the video (Hardsub)') },
                    { value: 'softsub', label: $L('Drawn by the app (Softsub)') },
                ],
            }, {
                key: 'preview', icon: 'photo', label: $L('Previews'), value: appConfig.preview, onChange: savePreview,
                options: [{ value: 'yes', label: $L('Yes') }, { value: 'no', label: $L('No') }],
            }],
        }, {
            title: $L('Home'),
            rows: [{
                key: 'homeFirst', icon: 'rows', label: $L('First row'), value: appConfig.homeFirst || 'suggestions',
                onChange: saveHomeFirst,
                options: [
                    { value: 'suggestions', label: $L('Suggestions') },
                    { value: 'continue', label: $L('Continue Watching') },
                ],
            }, {
                key: 'ui', icon: 'sparkles', label: $L('Interface'), value: appConfig.ui, onChange: saveUI,
                options: [{ value: 'full', label: $L('Full') }, { value: 'lite', label: $L('Lite') }],
            }, {
                key: 'clock', icon: 'clock', label: $L('Clock'), value: clockFormat, onChange: setClockFormat,
                options: [{ value: '24', label: $L('24-hour') }, { value: '12', label: $L('12-hour (a.m. / p.m.)') }],
            }],
        }, {
            title: $L('Top bar'),
            rows: [
                ['simulcast', 'tv', $L('Simulcast')], ['series', 'film', $L('Series')], ['movies', 'film', $L('Movies')],
                ['musics', 'note', $L('Music')], ['my_list', 'heart', $L('My List')],
            ].map(([key, icon, label]) => ({
                key: `tab-${key}`, icon, label, value: hiddenTabs.includes(key) ? 'hide' : 'show',
                onChange: value => setTabShown(key, value),
                options: [{ value: 'show', label: $L('Show') }, { value: 'hide', label: $L('Hide') }],
            })),
        }, {
            title: $L('Language'),
            rows: [{
                key: 'language', icon: 'globe', label: $L('App language'), value: language || 'auto', onChange: setLanguage,
                options: [{ value: 'auto', label: $L('Automatic (TV)') }, ...UI_LANGUAGES],
            }],
        }]
        if (profileLangs) {
            out[3].rows.push({
                key: 'contentLang', icon: 'textSize', label: $L('Titles and descriptions'),
                value: profile.preferred_communication_language, options: profileLangs.content, onChange: saveContentLang,
            }, {
                key: 'audioLang', icon: 'speaker', label: $L('Preferred audio'),
                value: profile.preferred_content_audio_language, options: profileLangs.audio, onChange: saveAudioLang,
            }, {
                key: 'subtitleLang', icon: 'bubble', label: $L('Preferred subtitles'),
                value: profile.preferred_content_subtitle_language, options: profileLangs.subtitle, onChange: saveSubtitleLang,
            })
        }
        out.push({
            title: $L('System'),
            rows: [{
                key: 'cache', icon: 'memory', label: $L('Cache Memory'), value: appConfig.cacheMemory, onChange: saveCache,
                options: ['adaptive', '5', '10', '15', '20', '30', '50'].map(value => ({
                    value, label: value === 'adaptive' ? $L('Automatic') : `${value} MB`
                })),
            }, ...(isLogged ? [{
                key: 'fonts', icon: 'refresh', label: $L('Sync Fonts'), loading: loadingFonts, onSelect: doSyncFonts,
                detail: fontList.length ? `${fontList.length} ${$L('fonts')}` : null,
            }] : []), {
                key: 'developer', icon: 'devtools', label: $L('Developer'), onSelect: openDeveloper,
            }],
        }, {
            title: $L('Account'),
            rows: [{
                key: 'about', icon: 'info', label: $L('About'), onSelect: openAbout,
            }, ...(isLogged ? [{
                key: 'logout', icon: 'logout', label: $L('Logout'), onSelect: openLogout,
            }] : [])],
        })
        return out
    }, [appConfig, language, profile, profileLangs, isLogged, loadingFonts, fontList, saveVideo, saveSubtitle,
        savePreview, saveHomeFirst, saveUI, setLanguage, saveContentLang, saveAudioLang, saveSubtitleLang, saveCache,
        doSyncFonts, openDeveloper, openAbout, openLogout, clockFormat, setClockFormat, hiddenTabs, setTabShown])

    return (
        <Panel {...rest} className={classNames(rest.className, css.settingsPanel, { [css.embedded]: noButtons })}>
            <div className={css.side}>
                <div className={css.bigIcon}><Icon name='gear' /></div>
                <h1 className={css.title}>{$L('Settings')}</h1>
                <div className={css.version}>Crunchyroll Stream</div>
            </div>
            <div className={css.main}>
                <SettingsList sections={sections} />
            </div>
            <PopupMessage show={!!(message?.type)} type={message?.type}>
                {message?.message || 'nothing'}
            </PopupMessage>
            <Alert open={askLogout}
                title={$L('Logout')}
                message={$L('Are you sure you want to logout?')}
                onAccept={doLogout}
                onCancel={cancelLogout} />
        </Panel>
    )
}

export default AppConfigPanel
