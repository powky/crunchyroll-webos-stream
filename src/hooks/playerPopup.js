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
 * Open state of a pop-up menu over the video controls. Back closes the pop-up and only it (the controls stay); every
 * other way of closing it (choosing, the close button, leaving it) may fire more than once, so closing is idempotent.
 * @returns {{open: Boolean, toggle: Function, close: Function}}
 */
export const usePlayerPopup = () => {
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

    useEffect(() => () => {  // the player went away with it open: drop its Back entry
        if (openRef.current) {
            popHistory()
        }
    }, [popHistory])

    return { open, toggle, close }
}
