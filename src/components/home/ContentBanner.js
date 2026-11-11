import { useEffect, useState, useMemo } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { useRecoilValue } from 'recoil'

import HeroInfo from '../ui/HeroInfo'
import { pickImage, pickLogo } from '../ui/images'
import { currentProfileState } from '../../recoilConfig'
import api from '../../api'
import css from './ContentBanner.module.less'


/**
 * Genre line from the API, for the content types that have one
 * @param {Object} content
 * @param {Boolean} noCategory
 * @returns {Array<String>}
 */
const useCategories = (content, noCategory) => {
    /** @type {import('crunchyroll-js-api').Types.Profile}*/
    const profile = useRecoilValue(currentProfileState)
    /** @type {[Array<String>, Function]} */
    const [categories, setCategories] = useState([])
    const allowedTypes = useMemo(() => ['series', 'episode', 'movie', 'movie_listing'], [])

    useEffect(() => {
        let active = true
        if (content && !noCategory && allowedTypes.includes(content.type)) {
            api.discover.getCategories(profile, { contentId: content.id }).then(({ data }) => {
                if (active) {
                    setCategories(data.map(val2 => val2.localization.title))
                }
            })
        } else {
            setCategories([])
        }
        return () => { active = false }
    }, [content, noCategory, profile, allowedTypes])

    return categories
}

/**
 * Title and metadata of a content, compact
 * @param {Object} obj
 * @param {Object} obj.content
 * @param {Boolean} [obj.noCategory]
 */
export const ContentHeader = ({ content, noCategory }) => {
    const categories = useCategories(content, noCategory)
    return (
        <HeroInfo content={{ ...content, description: null }} size='compact'>
            {categories.length > 0 && <div className={css.categories}>{categories.join(' · ')}</div>}
        </HeroInfo>
    )
}
ContentHeader.propTypes = {
    content: PropTypes.object.isRequired,
    noCategory: PropTypes.bool,
}

/**
 * Info about the focused item above a list: text on the left, artwork on the right
 * @param {Object} obj
 * @param {Object} [obj.content]
 * @param {Boolean} [obj.noCategory]
 * @param {Boolean} [obj.noPoster]
 */
const HomeContentBanner = ({ content, noCategory = false, noPoster = false, className, ...rest }) => {
    delete rest.spotlightDisabled
    const categories = useCategories(content, noCategory)

    return (
        <div className={classNames(css.homeContentBanner, className)} {...rest}>
            <div className={css.text}>
                {content &&
                    <HeroInfo content={content} size='compact' lines={3} logo={pickLogo(content)}>
                        {categories.length > 0 && <div className={css.categories}>{categories.join(' · ')}</div>}
                    </HeroInfo>
                }
            </div>
            {!noPoster && content &&
                <div className={css.poster}>
                    <img src={pickImage(content, { mode: 'wide', minWidth: 900 })} alt='' />
                </div>
            }
        </div>
    )
}

HomeContentBanner.propTypes = {
    content: PropTypes.object,
    noCategory: PropTypes.bool,
    noPoster: PropTypes.bool,
    className: PropTypes.string,
    spotlightDisabled: PropTypes.bool,
}

export default HomeContentBanner
