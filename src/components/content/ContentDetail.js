import { useEffect, useState, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { useRecoilValue } from 'recoil'

import Backdrop from '../ui/Backdrop'
import HeroInfo from '../ui/HeroInfo'
import { pickBackdrop, pickHeroBackdrop, pickLogo } from '../ui/images'
import DetailActions from './DetailActions'
import SeasonShelf from './SeasonShelf'
import MovieShelf from './MovieShelf'
import ExtraShelf from './ExtraShelf'
import LangSelector from './LangSelector'

import { isPremiumState } from '../../recoilConfig'
import { getArtContent } from '../../hooks/seriesArt'
import { useNavigateContent } from '../../hooks/navigate'
import { isPlayable } from '../../utils'
import css from './ContentDetail.module.less'


/**
 * Show page: artwork full-bleed, title and buttons on top, seasons and episodes (or similar, or music) below.
 * The audio and subtitles view replaces the page, like before; Back returns from it and from the extra rows.
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 */
const ContentDetail = ({ profile, content }) => {
    const {
        navigateContent, viewBackup, viewBackupRef,
        pushHistory, popHistory
    } = useNavigateContent(`contentDetail-${content.id}`)
    /** @type {Boolean} */
    const isPremium = useRecoilValue(isPremiumState)
    /** @type {['main'|'audio', Function]} */
    const [view, setView] = useState('main')
    /** @type {['episodes'|'similar'|'music', Function]} */
    const [shelf, setShelf] = useState('episodes')
    /** @type {{current: 'play'|'episodes'|'similar'|'music'}} where the focus was when leaving */
    const focusRef = useRef(viewBackup?.focus || 'play')
    /** @type {{current: Boolean}} a Back entry is pushed for the current extra row */
    const extraHistoryRef = useRef(false)
    /** @type {[Object, Function]} the content with its keyart (hero background, title logo) */
    const [art, setArt] = useState(content.images_localized ? content : null)

    useEffect(() => {
        let active = true
        getArtContent(profile, content).then(found => active && setArt(found))
        return () => { active = false }
    }, [profile, content])

    /** the same button again (or Back) returns to the episodes */
    const showShelf = useCallback((name) => {
        if (name === 'episodes' || name === shelf) {
            if (extraHistoryRef.current) {
                popHistory()
                extraHistoryRef.current = false
            }
            setShelf('episodes')
            return
        }
        setShelf(name)
        if (!extraHistoryRef.current) {
            extraHistoryRef.current = true
            pushHistory(() => {
                extraHistoryRef.current = false
                setShelf('episodes')
            })
        }
    }, [pushHistory, popHistory, shelf])

    const openAudio = useCallback(() => {
        pushHistory(() => setView('main'))
        setView('audio')
    }, [pushHistory])

    /**
     * @param {Object} newContent
     * @param {String} [from] which part of the page it came from, to put the focus back there later
     */
    const setContent = useCallback((newContent, from = 'play') => {
        if (extraHistoryRef.current) {
            // the extra row's Back entry goes; it's pushed again when this page comes back
            popHistory()
            extraHistoryRef.current = false
        }
        /** backup all state to restore later */
        viewBackupRef.current = { shelf, focus: from }
        navigateContent(newContent, { restoreCurrentContent: !isPlayable(newContent.type) })
    }, [shelf, navigateContent, viewBackupRef, popHistory])

    useEffect(() => {  // coming back: reopen the row it left from
        if (viewBackup?.shelf && viewBackup.shelf !== 'episodes') {
            showShelf(viewBackup.shelf)
        }
    }, [viewBackup?.shelf]) // eslint-disable-line react-hooks/exhaustive-deps

    const contentState = { content, setContent }
    const backToEpisodes = focusRef.current === 'episodes'

    return (
        <div className={css.ContentDetail}>
            <Backdrop src={pickHeroBackdrop(art) || (art ? pickBackdrop(content) : null)} preview={pickHeroBackdrop(art, 960)}
                fullDelay={300} variant={view === 'main' ? 'detail' : 'dim'} />
            {view === 'main' && <>
                <div className={css.top}>
                    <HeroInfo content={content} size='detail' lines={3} logo={pickLogo(art)} logoPending={art === null} />
                    <DetailActions
                        profile={profile}
                        content={content}
                        setContent={setContent}
                        shelf={shelf}
                        onShelf={showShelf}
                        onAudio={openAudio}
                        autoFocus={!backToEpisodes && shelf === 'episodes'} />
                </div>
                <div className={css.bottom}>
                    {shelf === 'episodes' && content.type === 'series' &&
                        <SeasonShelf
                            profile={profile}
                            contentState={contentState}
                            isPremium={isPremium}
                            autoFocus={backToEpisodes} />
                    }
                    {shelf === 'episodes' && content.type !== 'series' &&
                        <MovieShelf
                            profile={profile}
                            contentState={contentState}
                            isPremium={isPremium}
                            autoFocus={backToEpisodes} />
                    }
                    {shelf !== 'episodes' &&
                        <ExtraShelf
                            key={shelf}
                            profile={profile}
                            content={content}
                            kind={shelf}
                            setContent={setContent} />
                    }
                </div>
            </>}
            {view === 'audio' &&
                <div className={css.audioPage}>
                    <HeroInfo content={content} size='detail' lines={2} logo={pickLogo(art)} logoPending={art === null} />
                    <LangSelector profile={profile} content={content} />
                </div>
            }
        </div>
    )
}

ContentDetail.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
}

export default ContentDetail
