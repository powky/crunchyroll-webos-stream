
import { useCallback, useState, useEffect, useMemo } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import PropTypes from 'prop-types'

import api from '../../api'

/** SF Symbols thumbs in the app's icon font (tools/sf-symbols): outlined, filled once rated */
const THUMB = {
    up: '\uE001', down: '\uE002', upRated: '\uE003', downRated: '\uE004',
}


/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Object} obj.content
 */
const Rating = ({ profile, content, ...rest }) => {
    /** @type {[String, setRating]} */
    const [rating, setRating] = useState('')
    /** @type {Object} */
    const shortContent = useMemo(() => {
        return { contentId: content.id, contentType: content.type }
    }, [content])
    /** @type {Function} */
    const doRating = useCallback(newRating => {
        if (rating === newRating) {
            api.review.removeRating(profile, shortContent)
                .then(() => setRating(''))
                .catch(console.error)
        } else {
            api.review.updateEpisodeRating(profile, { ...shortContent, rating: newRating })
                .then(() => setRating(newRating))
                .catch(console.error)
        }
    }, [profile, shortContent, setRating, rating])

    /** @type {Function} */
    const rateUp = useCallback(() => doRating('up'), [doRating])

    /** @type {Function} */
    const rateDown = useCallback(() => doRating('down'), [doRating])

    useEffect(() => {
        api.review.getRatings(profile, shortContent).then(data => {
            if (data && data.rating) {
                setRating(data.rating)
            } else {
                setRating('')
            }
        }).catch(err => {
            console.error(err)
            setRating('')
        })
    }, [profile, shortContent, setRating])

    return (
        <>
            <IconButton backgroundOpacity="lightTranslucent"
                selected={rating === 'down'}
                onClick={rateDown}
                {...rest}>
                {rating === 'down' ? THUMB.downRated : THUMB.down}
            </IconButton>
            <IconButton backgroundOpacity="lightTranslucent"
                selected={rating === 'up'}
                onClick={rateUp}
                {...rest}>
                {rating === 'up' ? THUMB.upRated : THUMB.up}
            </IconButton>
        </>
    )
}

Rating.propTypes = {
    profile: PropTypes.object.isRequired,
    content: PropTypes.object.isRequired,
}

export default Rating
