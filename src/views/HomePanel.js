
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'
import classNames from 'classnames'

import { useRecoilValue, useSetRecoilState } from 'recoil'

import { currentProfileState, categoriesState, homeViewReadyState, uiLanguageState } from '../recoilConfig'
import TopNav from '../components/home/TopNav'
import HomeFeed from '../components/home/Feed'
import MusicBrowse from '../components/music/Music'
import ContentGrid from '../components/grid/ContentGrid'
import Simulcast from '../components/simulcast/Simulcast'
import Watchlist from '../components/watchlist/Watchlist'
import api from '../api'
import AppConfigPanel from './AppConfigPanel'
import ContactMePanel from './ContactMePanel'
import ConfirmExitPanel from './ConfirnExitPanel'
import { $L } from '../hooks/language'
import { useResetHomeState } from '../hooks/navigate'
import { useHomeFeedWorker } from '../hooks/homefeedWorker'
import { useViewBackup } from '../hooks/viewBackup'
import css from './HomePanel.module.less'


const ActivityViews = ({ index, children }) => (children[index])

/**
 * Puts "Continue Watching" first or second (setting homeFirst). Rows get their new position as `index`, and the
 * feed a different id per order, because rows are cached and restored by feed id and index.
 * @param {{id: Number, items: Array<Object>}} homeFeed
 * @param {'suggestions'|'continue'} homeFirst
 * @returns {{id: Number, items: Array<Object>}}
 */
const orderHomeFeed = (homeFeed, homeFirst) => {
    const items = homeFeed.items || []
    const historyIndex = items.findIndex(item => item.type === 'HistoryCollection' || item.response_type === 'history')
    if (historyIndex < 0) {
        return homeFeed
    }
    const target = homeFirst === 'continue' ? 0 : Math.min(1, items.length - 1)
    const reordered = items.slice()
    const [history] = reordered.splice(historyIndex, 1)
    reordered.splice(target, 0, history)
    return {
        ...homeFeed,
        id: homeFeed.id + (homeFirst === 'continue' ? 1 : 2),
        items: reordered.map((item, index) => ({ ...item, index })),
    }
}

const HomePanel = (props) => {
    const { viewBackup, viewBackupRef } = useViewBackup('homePanel')
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Number, Function]} */
    const [currentActivity, setCurrentActivity] = useState(viewBackup?.currentActivity || 0)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {Function} */
    const setCategories = useSetRecoilState(categoriesState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(true)

    /** @type {[{id: Number, items: Array<import('../hooks/homefeedWorker').HomefeedItem>}, Function]} */
    const [homeFeed, setHomeFeed] = useState({ id: Date.now(), items: [] })

    /** @type {[{id: Number, items: Array<Object>}, Function]} */
    const [musicFeed, setMusicFeed] = useState({ id: Date.now(), items: [] })
    /** @type {Function} */
    const resetHomeState = useResetHomeState()
    const processHomeFeed = useHomeFeedWorker()

    /** @type {String} the labels follow the app language setting */
    const language = useRecoilValue(uiLanguageState)
    /** @type {Array<{key: String, icon: String, label: String}>} */
    const toolbarList = useMemo(() => [
        { key: 'home', icon: 'home', label: $L('Home') },
        { key: 'simulcast', icon: 'resumeplay', label: $L('Simulcast') },
        { key: 'search', icon: 'search', label: $L('Search') },
        { key: 'series', icon: 'series', label: $L('Series') },
        { key: 'movies', icon: 'recordings', label: $L('Movies') },
        { key: 'musics', icon: 'music', label: $L('Music') },
        { key: 'my_list', icon: 'denselist', label: $L('My List') },
        { key: 'config', icon: 'gear', label: $L('Configuration') },
        { key: 'info', icon: 'info', label: $L('About Me?') },
        { key: 'close', icon: 'closex', label: $L('Close') },
    ], [language]) // eslint-disable-line react-hooks/exhaustive-deps

    /** @type {Function} */
    const setActivity = useCallback((ev) => {
        const tmpIndex = ev ? parseInt(ev.currentTarget.dataset.index) : 0
        setCurrentActivity(tmpIndex)
        if (tmpIndex !== currentActivity) {
            resetHomeState()
        }
    }, [setCurrentActivity, currentActivity, resetHomeState])

    useEffect(() => {
        const loadFeed = async () => {
            if (currentActivity === 0) {
                const [homeFeedCache, categoriesCache] = await Promise.all([
                    api.utils.getCustomCache('/homeFeed'),
                    api.utils.getCustomCache('/categories')
                ])

                if (homeFeedCache && categoriesCache) {
                    setHomeFeed(homeFeedCache)
                    setCategories(categoriesCache)
                } else {
                    const homeFeedProm = api.discover.getNewHomeFeed(profile).then(processHomeFeed)
                    const categoriesProm = api.discover.getCategories(profile).then(({ data: categs }) => {
                        return [
                            { id: 'all', title: $L('All') },
                            ...categs.map(cat => ({ id: cat.id, title: cat.localization.title }))
                        ]
                    })

                    const [newHomeFeed, categories] = await Promise.all([homeFeedProm, categoriesProm])
                    setHomeFeed(newHomeFeed)
                    setCategories(categories)

                    api.utils.saveCustomCache('/homeFeed', newHomeFeed, 3 * 60 * 60)  // 3h
                    api.utils.saveCustomCache('/categories', categories, 3 * 60 * 60) // 3h
                }
            } else if (currentActivity === 5) {
                const musicFeedCache = await api.utils.getCustomCache('/musicFeed')
                if (musicFeedCache) {
                    setMusicFeed(musicFeedCache)
                } else {
                    const newMusicFeed = await api.music.getFeed(profile).then(processHomeFeed)
                    setMusicFeed(newMusicFeed)
                    api.utils.saveCustomCache('/musicFeed', newMusicFeed, 3 * 60 * 60) // 3h
                }
            }
        }
        setLoading(true)
        loadFeed().then(() => currentActivity != null && setLoading(false))
    }, [profile, currentActivity, setCategories, setHomeFeed, setMusicFeed, processHomeFeed])

    useEffect(() => {
        return () => {
            setHomeViewReady(false)
        }
    }, [setHomeViewReady])

    /** @type {{id: Number, items: Array<Object>}} */
    const orderedFeed = useMemo(
        () => orderHomeFeed(homeFeed, (api.config.getAppConfig() || {}).homeFirst),
        [homeFeed]
    )

    /** backup all state to restore later */
    viewBackupRef.current = { currentActivity }

    return (
        <Panel {...props} className={classNames(props.className, css.homePanel)}>
            {loading &&
                <div className={css.loading}>
                    <Spinner />
                </div>
            }
            {!loading &&
                <ActivityViews index={currentActivity}>
                    <HomeFeed profile={profile}
                        homeFeed={orderedFeed}
                        feedType='home' />
                    <div className={css.page}>
                        <Simulcast profile={profile}
                            title={toolbarList[currentActivity].label} />
                    </div>
                    <div className={css.page}>
                        <ContentGrid profile={profile}
                            contentKey='home-search'
                            title={toolbarList[currentActivity].label} />
                    </div>
                    <div className={css.page}>
                        <ContentGrid profile={profile}
                            contentKey='home-series'
                            contentType='series'
                            title={toolbarList[currentActivity].label} />
                    </div>
                    <div className={css.page}>
                        <ContentGrid profile={profile}
                            contentKey='home-movies'
                            contentType='movie_listing'
                            title={toolbarList[currentActivity].label} />
                    </div>
                    <MusicBrowse profile={profile}
                        title={toolbarList[currentActivity].label}
                        musicFeed={musicFeed} />
                    <div className={css.page}>
                        <Watchlist profile={profile} />
                    </div>
                    <div className={css.page}>
                        <AppConfigPanel noButtons />
                    </div>
                    <div className={css.page}>
                        <ContactMePanel noAcceptBtn />
                    </div>
                    <div className={css.page}>
                        <ConfirmExitPanel onCancel={setActivity} />
                    </div>
                </ActivityViews>
            }
            <TopNav
                toolbarList={toolbarList}
                currentIndex={currentActivity}
                onClick={setActivity}
                profile={profile} />
        </Panel>
    )
}

export default HomePanel
