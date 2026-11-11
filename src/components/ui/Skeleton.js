import PropTypes from 'prop-types'
import classNames from 'classnames'

import { cardHeight, CARD_LIFT } from './Card'
import css from './Skeleton.module.less'


/**
 * One placeholder block
 * @param {Object} obj
 * @param {Number|String} [obj.w]
 * @param {Number|String} [obj.h]
 * @param {Number|String} [obj.r] border radius
 */
export const Bone = ({ w, h, r, className, style }) => (
    <div className={classNames(css.bone, className)}
        style={Object.assign({ width: w, height: h, borderRadius: r }, style)} />
)

Bone.propTypes = {
    w: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    h: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    r: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    className: PropTypes.string,
    style: PropTypes.object,
}

/**
 * The shape of what's loading, pulsing gently. The whole group fades as one layer (opacity only), so a loading
 * screen costs the GPU one composite, not a repaint per block.
 */
export const Skeleton = ({ className, style, children }) => (
    <div className={classNames(css.skeleton, className)} style={style} aria-busy='true'>{children}</div>
)

Skeleton.propTypes = {
    className: PropTypes.string,
    style: PropTypes.object,
    children: PropTypes.node,
}

/**
 * Placeholder of a card: artwork and its two lines, with the same focus margin real cards have
 * @param {Object} obj
 * @param {Number} obj.width artwork width
 * @param {'wide'|'tall'} [obj.mode]
 * @param {Number} [obj.lines] text lines under it
 */
export const CardBone = ({ width, mode = 'wide', lines = 2 }) => (
    <div className={css.card} style={{ width: width + 2 * CARD_LIFT, padding: `${CARD_LIFT}px ${CARD_LIFT}px 0` }}>
        <Bone w={width} h={cardHeight(width, mode)} r={14} />
        {lines > 0 && <Bone w={Math.round(width * 0.72)} h={20} r={6} style={{ marginTop: 22 }} />}
        {lines > 1 && <Bone w={Math.round(width * 0.46)} h={16} r={6} style={{ marginTop: 12 }} />}
        {lines > 2 && <Bone w={Math.round(width * 0.86)} h={16} r={6} style={{ marginTop: 10 }} />}
    </div>
)

CardBone.propTypes = {
    width: PropTypes.number.isRequired,
    mode: PropTypes.oneOf(['wide', 'tall']),
    lines: PropTypes.number,
}

/**
 * A row of card placeholders
 * @param {Object} obj
 * @param {Number} obj.width
 * @param {Number} [obj.count]
 * @param {'wide'|'tall'} [obj.mode]
 * @param {Number} [obj.lines]
 */
export const SkeletonCards = ({ width, count = 5, mode = 'wide', lines = 2, className }) => (
    <Skeleton className={classNames(css.cards, className)}>
        {Array.from({ length: count }, (_v, i) => <CardBone key={i} width={width} mode={mode} lines={lines} />)}
    </Skeleton>
)

SkeletonCards.propTypes = {
    width: PropTypes.number.isRequired,
    count: PropTypes.number,
    mode: PropTypes.oneOf(['wide', 'tall']),
    lines: PropTypes.number,
    className: PropTypes.string,
}

/**
 * Grid of card placeholders
 * @param {Object} obj
 * @param {Number} obj.width
 * @param {Number} [obj.columns]
 * @param {Number} [obj.rows]
 * @param {'wide'|'tall'} [obj.mode]
 */
export const SkeletonGrid = ({ width, columns = 4, rows = 2, mode = 'wide' }) => (
    <Skeleton className={css.grid}>
        {Array.from({ length: rows }, (_r, r) => (
            <div key={r} className={css.cards}>
                {Array.from({ length: columns }, (_c, c) => <CardBone key={c} width={width} mode={mode} />)}
            </div>
        ))}
    </Skeleton>
)

SkeletonGrid.propTypes = {
    width: PropTypes.number.isRequired,
    columns: PropTypes.number,
    rows: PropTypes.number,
    mode: PropTypes.oneOf(['wide', 'tall']),
}

/** placeholder of a hero: title, metadata and three lines of synopsis (and an eyebrow over the title) */
export const SkeletonHero = ({ className, style, eyebrow = true }) => (
    <Skeleton className={className} style={style}>
        {eyebrow && <Bone w={140} h={18} r={6} style={{ marginBottom: 18 }} />}
        <Bone w={560} h={72} r={12} />
        <Bone w={420} h={26} r={8} style={{ marginTop: 26 }} />
        <Bone w={780} h={22} r={6} style={{ marginTop: 28 }} />
        <Bone w={740} h={22} r={6} style={{ marginTop: 14 }} />
        <Bone w={520} h={22} r={6} style={{ marginTop: 14 }} />
    </Skeleton>
)

SkeletonHero.propTypes = {
    className: PropTypes.string,
    style: PropTypes.object,
    eyebrow: PropTypes.bool,
}

/**
 * Lines of text
 * @param {Object} obj
 * @param {Array<Number>} [obj.widths] one per line
 * @param {Number} [obj.height]
 */
export const SkeletonLines = ({ widths = [520, 460, 380], height = 24, gap = 16, className, style }) => (
    <Skeleton className={className} style={style}>
        {widths.map((w, i) => <Bone key={i} w={w} h={height} r={8} style={{ marginTop: i ? gap : 0 }} />)}
    </Skeleton>
)

SkeletonLines.propTypes = {
    widths: PropTypes.arrayOf(PropTypes.number),
    height: PropTypes.number,
    gap: PropTypes.number,
    className: PropTypes.string,
    style: PropTypes.object,
}

/**
 * A line of pill (and round) buttons
 * @param {Object} obj
 * @param {Array<Number>} obj.widths pill widths; 0 draws a round button
 * @param {Number} [obj.height]
 */
export const SkeletonPills = ({ widths, height = 64, className }) => (
    <Skeleton className={classNames(css.pills, className)}>
        {widths.map((w, i) => <Bone key={i} w={w || height} h={height} r={height} style={{ marginRight: 16 }} />)}
    </Skeleton>
)

SkeletonPills.propTypes = {
    widths: PropTypes.arrayOf(PropTypes.number).isRequired,
    height: PropTypes.number,
    className: PropTypes.string,
}

export default Skeleton
