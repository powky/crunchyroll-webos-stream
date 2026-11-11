
import { useEffect, useState, useMemo } from 'react'
import PropTypes from 'prop-types'

import { useSetRecoilState } from 'recoil'

import SelectLanguage from '../SelectLanguage'
import Field from '../Field'
import { currentProfileState } from '../../recoilConfig'
import { useMapLang, $L } from '../../hooks/language'
import { useSaveOneProfileField } from '../../hooks/profile'
import css from './ContentDetail.module.less'


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 */
const LangSelector = ({ profile, content, ...rest }) => {
    /** @type {Function} */
    const mapLang = useMapLang()
    /** @type {Function} */
    const setProfile = useSetRecoilState(currentProfileState)
    const metadata = useMemo(() => {
        let metadataTmp = {}
        if (content) {
            if (content.type === 'series') {
                metadataTmp = content.series_metadata
            } else if (content.type === 'movie_listing') {
                metadataTmp = content.movie_listing_metadata
            }
        }
        return metadataTmp
    }, [content])
    /** @type {{audio_locales: Array<String>, subtitle_locales: Array<String>}} */
    const { audio_locales, subtitle_locales } = metadata
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [audioLangList, setAudioLangList] = useState([])
    /** @type {[Array<{children: String, key: String}>, Function]} */
    const [subtitleLangList, setSubtitleLangList] = useState([])
    const saveAudio = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_audio_language' })
    const saveSubs = useSaveOneProfileField({ profile, setProfile, field: 'preferred_content_subtitle_language' })

    useEffect(() => {
        const loadData = async () => {
            if (audio_locales && audio_locales.length > 0) {
                setAudioLangList(audio_locales.map(mapLang))
            }
            if (subtitle_locales && subtitle_locales.length > 0) {
                setSubtitleLangList(['off', ...subtitle_locales].map(mapLang))
            }
        }
        loadData()
    }, [mapLang, audio_locales, subtitle_locales])

    return (
        <div className={css.langSelector} {...rest}>
                {subtitleLangList && subtitleLangList.length > 0 && (
                    <Field title={$L('Subtitle')}>
                        <SelectLanguage
                            languages={subtitleLangList}
                            save={saveSubs}
                            value={profile.preferred_content_subtitle_language} />
                    </Field>
                )}
                {audioLangList && audioLangList.length > 0 && (
                    <Field title={$L('Audio')}>
                        <SelectLanguage
                            languages={audioLangList}
                            save={saveAudio}
                            value={profile.preferred_content_audio_language} />
                    </Field>
                )}
        </div>
    )
}

LangSelector.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
}

export default LangSelector
