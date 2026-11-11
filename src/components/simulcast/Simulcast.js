
import { useCallback, useState, useEffect, useMemo } from 'react'
import PillButton from '../ui/PillButton'
import Dropdown from '@enact/moonstone/Dropdown'
import PropTypes from 'prop-types'

import ContentGridItems from '../grid/ContentGridItems'
import css from '../grid/ContentGrid.module.less'
import { dropdownKeydown } from '../SelectLanguage'
import { $L } from '../../hooks/language'
import api from '../../api'
import { useContentList, useOrderOptions, useViewModes } from '../../hooks/contentList'
import { sortContent } from '../../utils'


/**
 * @typedef Season
 * @type {Object}
 * @property {String} id
 * @property {Number} index
 * @property {{title: String, description: String}} localization
 */

/**
 * @param {Date} [date=new Date()]
 * @returns {String}
 */
function getLocalSeason (date = new Date()) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    let out = 'fall'

    if (
        (month === 12 && day >= 21) ||
        month < 3 ||
        (month === 3 && day < 21)
    ) {
        return 'winter'
    } else if (
        (month === 3 && day >= 21) ||
        month < 6 ||
        (month === 6 && day < 21)
    ) {
        out = 'spring'
    } else if (
        (month === 6 && day >= 21) ||
        month < 9 ||
        (month === 9 && day < 23)
    ) {
        out = 'summer'
    }

    return out
}


/**
 * Simulcast view
 * @TODO add poster for first weeks of season
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile current profile
 * @param {String} obj.title title for view
 */
const Simulcast = ({ profile, title, ...rest }) => {

    const { contentList, quantity, autoScroll, delay,
        mergeContentList, changeContentList, onFilter,
        viewBackup, viewBackupRef, navigateContent,
    } = useContentList('simulcast')

    /** @type {[import('./SeasonButtons').Season, Function]} */
    const [season, setSeason] = useState(viewBackup?.season || undefined)
    /** @type {[Array<Season>, Function]} */
    const [seasons, setSeasons] = useState(viewBackup?.seasons || undefined)
    const [sort, orderLabels, orderStr, onSelectOrder] = useOrderOptions(viewBackup?.sort, onFilter)
    const [viewMode, viewModeLabels, viewModeStr, onSelectViewMode] = useViewModes(viewBackup?.viewMode, onFilter)
    /** @type {Array} */
    const contentListSorted = useMemo(() => contentList && [...contentList].sort(sortContent), [contentList])

    /** @type {import('../grid/ContentGrid').SearchOptions} */
    const options = useMemo(() => {
        return {
            quantity,
            ratings: true,
            noMock: true,
            seasonTag: season && season.id,
            sort,
            viewMode,
        }
    }, [season, quantity, sort, viewMode])

    /** @type {Function} */
    const prevSeason = useCallback(() => {
        setSeason(seasons[season.index + 1])
        onFilter({ delay: 0 })
    }, [season, seasons, onFilter])

    /** @type {Function} */
    const nextSeason = useCallback(() => {
        setSeason(seasons[season.index - 1])
        onFilter({ delay: 0 })
    }, [season, seasons, onFilter])

    /** @type {Function} */
    const onLoad = useCallback((index) => {
        if (mergeContentList(false, index)) {
            api.discover.getBrowseAll(profile, { ...options, start: index })
                .then(res => mergeContentList(res.data, index))
        }
    }, [profile, mergeContentList, options])

    /** @type {Function} */
    const setLocalContent = useCallback(newContent => {
        /** backup all state to restore later */
        viewBackupRef.current = { season, seasons, sort, viewMode }
        navigateContent(newContent)
    }, [navigateContent, viewBackupRef, season, seasons, sort, viewMode])

    useEffect(() => {
        if (delay >= 0) {
            changeContentList(null)
            if (season && season.id) {
                api.discover.getBrowseAll(profile, options).then(res => {
                    changeContentList([...res.data, ...new Array(res.total - res.data.length)])
                })
            }
        }
    }, [profile, changeContentList, options, season, delay])

    useEffect(() => {
        if (delay >= 0 && !season) {
            api.discover.getSeasonList(profile).then(({ data: seasonsList }) => {
                seasonsList.forEach((item, index) => { item.index = index })
                setSeasons(seasonsList)
                if (seasonsList[0].id.split('-')[0] === getLocalSeason()) {
                    setSeason(seasonsList[0])
                } else {
                    setSeason(seasonsList[1])
                }
            })
        }
    }, [profile, setSeason, delay, season])

    useEffect(() => {  // initializing
        onFilter({ delay: 0 })
    }, [profile, changeContentList, onFilter])

    return (
        <div className={css.ContentGrid} {...rest}>
            <div className={css.header}>
                <Dropdown title={$L('Order')}
                    className={css.filter}
                    selected={orderLabels.findIndex(i => i.key === sort)}
                    width='small'
                    onSelect={onSelectOrder}
                    onKeyDown={dropdownKeydown}>
                    {orderStr}
                </Dropdown>
                <Dropdown title={$L('Presentation')}
                    className={css.filter}
                    selected={viewModeLabels.findIndex(i => i.key === viewMode)}
                    width='small'
                    onSelect={onSelectViewMode}
                    onKeyDown={dropdownKeydown}>
                    {viewModeStr}
                </Dropdown>
                {season && season.index + 1 < seasons.length &&
                    <PillButton small round icon='back' aria-label={$L('Prev Season')} onClick={prevSeason} />
                }
                <div className={css.seasonTitle}>
                    {season && season.localization.title ? season.localization.title : title}
                </div>
                {season && season.index - 1 >= 0 &&
                    <PillButton small round icon='chevronRight' aria-label={$L('Next Season')} onClick={nextSeason} />
                }
            </div>
            <div className={css.scrollerContainer}>
                <ContentGridItems
                    type='simulcast'
                    mode='wide'
                    dates
                    contentList={contentListSorted}
                    load={onLoad}
                    onSelect={setLocalContent}
                    autoScroll={autoScroll} />
            </div>
        </div>
    )
}

Simulcast.propTypes = {
    profile: PropTypes.object.isRequired,
    title: PropTypes.string.isRequired,
}

export default Simulcast
