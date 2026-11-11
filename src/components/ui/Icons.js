import PropTypes from 'prop-types'


/** fallback 24x24 glyphs, used when the SF Symbols set wasn't generated (see tools/sf-symbols) */
const PATHS = {
    play: 'M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z',
    pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
    plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z',
    check: 'M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
    star: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8z',
    starOutline: 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8zm0 4.6l-1.5 3.2-3.5.4 2.6 2.4-.7 3.5 3.1-1.8 3.1 1.8-.7-3.5 2.6-2.4-3.5-.4z',
    bubble: 'M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5v2h10V9zm0 4v2h7v-2z',
    grid: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',
    note: 'M9 3v12.3A3.5 3.5 0 1 0 11 18.5V8h8V3z',
    search: 'M10.5 3a7.5 7.5 0 0 1 5.96 12.05l4.74 4.74-1.41 1.41-4.74-4.74A7.5 7.5 0 1 1 10.5 3zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
    gear: 'M10.3 2h3.4l.5 2.6 1.6.9 2.5-.9 1.7 2.9-2 1.8v1.4l2 1.8-1.7 2.9-2.5-.9-1.6.9-.5 2.6h-3.4l-.5-2.6-1.6-.9-2.5.9-1.7-2.9 2-1.8V9.3l-2-1.8 1.7-2.9 2.5.9 1.6-.9zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    info: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1 8v7h2v-7zm0-4v2h2V6z',
    power: 'M11 2h2v10h-2zM6.3 5.3l1.4 1.4A7 7 0 1 0 16.3 6.7l1.4-1.4A9 9 0 1 1 6.3 5.3z',
    sort: 'M7 3l4 4H8v13H6V7H3zm10 18l-4-4h3V4h2v13h3z',
    list: 'M4 5h2v2H4zm4 0h12v2H8zM4 11h2v2H4zm4 0h12v2H8zm-4 6h2v2H4zm4 0h12v2H8z',
    tv: 'M3 5h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6v2H9v-2H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 2v9h16V7z',
    film: 'M4 3h2v2h12V3h2v18h-2v-2H6v2H4zm2 4v4h12V7zm0 6v4h12v-4z',
    home: 'M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z',
    calendar: 'M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zM5 9v10h14V9z',
    user: 'M12 3a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 11c4.4 0 8 2 8 4.5V21H4v-2.5C4 16 7.6 14 12 14z',
    logout: 'M10 3h9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-9v-2h8V5h-8zM8.6 7.4L10 8.8 7.8 11H15v2H7.8l2.2 2.2-1.4 1.4L4 12z',
    mail: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1 3.2V17h16V8.2l-8 5zM5.4 7l6.6 4.1L18.6 7z',
    qr: 'M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h3v3h-3zm5 0h3v3h-3zm-5 5h3v3h-3zm5 0h3v3h-3zm-2.5-2.5h3v3h-3z',
    key: 'M7.5 9a5.5 5.5 0 0 1 10.6-2H23v4h-2v3h-3v-3h-.9A5.5 5.5 0 1 1 7.5 9zm5.5-2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    skip: 'M4 5.5L13.5 12 4 18.5zm9 0L22.5 12 13 18.5z',
    back: 'M15.4 4.6L8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2z',
    edit: 'M4 17.2V20h2.8l8.3-8.3-2.8-2.8zM19.7 7.1a1 1 0 0 0 0-1.4l-1.4-1.4a1 1 0 0 0-1.4 0l-1.6 1.6 2.8 2.8z',
}

/** the SF Symbols set, when tools/sf-symbols/build.py has generated it on this machine (it's not in git) */
const generated = (() => {
    const context = require.context('./', false, /^\.\/sfSymbols\.generated\.json$/)
    const keys = context.keys()
    return keys.length ? context(keys[0]) : null
})()

/** every SF glyph is drawn in the same box, so they keep Apple's relative optical sizes (100 pt symbols) */
const SF_BOX = 230

/**
 * Registers the "CR Icons" font: the SF Symbols at moonstone's icon code points, so moonstone's own icons
 * (video player, popups, dropdowns) draw them too. Moonstone's CSS asks for "CR Icons" first (gulpfile).
 */
export const injectIconFont = () => {
    if (generated && generated.font && typeof document !== 'undefined') {
        const style = document.createElement('style')
        style.textContent = `@font-face { font-family: 'CR Icons'; src: url(${generated.font}) format('opentype'); }`
        document.head.appendChild(style)
    }
}

/**
 * @param {Object} obj
 * @param {String} obj.name
 * @param {String} [obj.className]
 */
const Icon = ({ name, className, ...rest }) => {
    const glyph = generated && generated.glyphs[name]
    if (glyph) {
        const x = glyph.w / 2 - SF_BOX / 2
        const y = glyph.h / 2 - SF_BOX / 2
        return (
            <svg className={className} viewBox={`${x} ${y} ${SF_BOX} ${SF_BOX}`} width='1em' height='1em'
                fill='currentColor' aria-hidden='true' {...rest}>
                <path d={glyph.d} />
            </svg>
        )
    }
    return (
        <svg className={className} viewBox='0 0 24 24' width='1em' height='1em' fill='currentColor' aria-hidden='true' {...rest}>
            <path d={PATHS[name] || PATHS.play} />
        </svg>
    )
}

Icon.propTypes = {
    name: PropTypes.string.isRequired,
    className: PropTypes.string,
}

export default Icon
