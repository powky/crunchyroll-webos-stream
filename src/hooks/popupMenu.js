import { useCallback, useEffect, useRef, useState } from 'react'

import { useNavigate } from './navigate'


/**
 * The app's Back runs on keydown; moonstone's (the video controls hide, a pop-up dismisses) on the keyup after it.
 * Once a pop-up has closed on the keydown, nothing else should act on that keyup.
 */
const swallowBackKeyUp = () => {
    const swallow = (ev) => {
        if (ev.keyCode === 461) {
            ev.stopPropagation()
            window.removeEventListener('keyup', swallow, true)
        }
    }
    window.addEventListener('keyup', swallow, true)
    setTimeout(() => window.removeEventListener('keyup', swallow, true), 800)  // a keyup that never comes
}

/**
 * Open state of a pop-up menu (the player's subtitle and audio menus, the avatar's menu). Back closes the pop-up and
 * only it (the video controls stay, the app doesn't ask to exit); every other way of closing it (choosing, leaving it)
 * may fire more than once, so closing is idempotent.
 * @returns {{open: Boolean, toggle: Function, close: Function}}
 */
export const usePopupMenu = () => {
    const { pushHistory, popHistory } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [open, setOpen] = useState(false)
    /** @type {{current: Boolean}} the truth, ahead of the next render */
    const openRef = useRef(false)

    const close = useCallback(() => {
        if (openRef.current) {
            openRef.current = false
            setOpen(false)
            popHistory()
        }
    }, [popHistory])

    const toggle = useCallback(() => {
        if (openRef.current) {
            close()
        } else {
            openRef.current = true
            setOpen(true)
            pushHistory(() => {
                openRef.current = false
                setOpen(false)
                swallowBackKeyUp()
            })
        }
    }, [close, pushHistory])

    useEffect(() => () => {  // the screen went away with it open: drop its Back entry
        if (openRef.current) {
            popHistory()
        }
    }, [popHistory])

    return { open, toggle, close }
}
