import Spottable from '@enact/spotlight/Spottable'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Icon from './Icons'
import { useStoredImage } from '../../hooks/imageStore'
import css from './Card.module.less'


const SpottableDiv = Spottable('div')

/** px around the artwork on each side for the focus lift and ring (@cr-lift); a list cell is width + 2 * CARD_LIFT */
export const CARD_LIFT = 24

/** card artwork height for a width, per shape */
export const cardHeight = (width, mode = 'wide') => Math.round(mode === 'tall' ? width * 1.5 : width * 9 / 16)

/**
 * Poster card: artwork with a white ring and a small lift when focused, title and subtitle below
 * @param {Object} obj
 * @param {String} obj.image
 * @param {Number} obj.width artwork width in px
 * @param {'wide'|'tall'} [obj.mode]
 * @param {String} [obj.title]
 * @param {String} [obj.subtitle]
 * @param {Number} [obj.progress] 0-100
 * @param {String} [obj.badge] e.g. Premium
 * @param {String} [obj.duration]
 * @param {Boolean} [obj.watched]
 * @param {String} [obj.number] episode number shown before the title
 * @param {String} [obj.text] two lines of synopsis under the subtitle
 */
const Card = ({
    image, width, mode = 'wide', title, subtitle, progress, badge, duration, watched, number, text,
    className, children, ...rest
}) => {
    const src = useStoredImage(image)
    return (
        <SpottableDiv className={classNames('cr-own', css.card, className)} {...rest}>
            <div className={css.art} style={{ width, height: cardHeight(width, mode) }}>
                {src && <img src={src} alt='' decoding='async' />}
                {progress > 0 &&
                    <div className={css.progress}><i style={{ width: `${Math.min(100, progress)}%` }} /></div>
                }
                {badge && <div className={css.badge}>{badge}</div>}
                {duration && <div className={css.duration}>{duration}</div>}
                {watched && <div className={css.watched}><Icon name='check' /></div>}
                {children}
            </div>
            {title &&
                <div className={css.title} style={{ width }}>
                    {number != null && <b>{number}</b>}
                    {title}
                </div>
            }
            {subtitle && <div className={css.subtitle} style={{ width }}>{subtitle}</div>}
            {text && <div className={css.text} style={{ width }}>{text}</div>}
        </SpottableDiv>
    )
}

Card.propTypes = {
    image: PropTypes.string,
    width: PropTypes.number.isRequired,
    mode: PropTypes.oneOf(['wide', 'tall']),
    title: PropTypes.string,
    subtitle: PropTypes.string,
    progress: PropTypes.number,
    badge: PropTypes.string,
    duration: PropTypes.string,
    watched: PropTypes.bool,
    number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    text: PropTypes.string,
    className: PropTypes.string,
    children: PropTypes.node,
}

export default Card
