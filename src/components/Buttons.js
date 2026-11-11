
import { useCallback, useState } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import { useSetRecoilState } from 'recoil'

import Alert from './Alert'
import PillButton from './ui/PillButton'
import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import { contactBtnState } from '../recoilConfig'
import api from '../api'


/**
 * @typedef {Object} AppButtonPropsBase
 * @property {'full'|'short'} [mode]
 * @property {String} icon
 * @property {Function} onClick
 *
 * @param {AppButtonPropsBase & import('@enact/moonstone/IconButton').IconButtonProps} obj
 */
/** moonstone icon names used here -> the app's own glyphs (components/ui/Icons) */
const ICONS = { gear: 'gear', info: 'info', arrowshrinkright: 'power' }

/**
 * @param {Object} obj
 * @param {'short'|'full'} [obj.mode] round icon, or icon and label
 * @param {Boolean} [obj.player] moonstone's button, to match the rest of the video player's controls
 */
export const AppIconButton = ({ mode = 'short', onClick, tooltipText, icon, player, ...rest }) => {
    if (player) {
        return (
            <IconButton backgroundOpacity='lightTranslucent' onClick={onClick} tooltipText={tooltipText} {...rest}>
                {icon}
            </IconButton>
        )
    }
    if (mode === 'full') {
        return <PillButton icon={ICONS[icon] || icon} onClick={onClick} {...rest}>{tooltipText}</PillButton>
    }
    return <PillButton round icon={ICONS[icon] || icon} aria-label={tooltipText} onClick={onClick} {...rest} />
}


export const DevBtn = () => {
    const { goTo } = useNavigate()
    const onClick = useCallback(() => {
        goTo('/developer')
    }, [goTo])

    return (
        <AppIconButton
            mode='full'
            onClick={onClick}
            tooltipText='Dev'
            icon='gear'
        />
    )
}

export const AppConfigBtn = ({ mode = 'short', player }) => {
    const { goTo } = useNavigate()
    const onClick = useCallback(() => {
        goTo('/appConfig')
    }, [goTo])

    return (
        <AppIconButton
            mode={mode}
            player={player}
            onClick={onClick}
            tooltipText={$L('Config')}
            icon='gear'
        />
    )
}

export const ContactMeBtn = ({ player }) => {
    const { goTo } = useNavigate()
    /** @type {Function} */
    const setContactBtn = useSetRecoilState(contactBtnState)

    const contactMe = useCallback(() => {
        setContactBtn(false)
        goTo('/contact')
    }, [setContactBtn, goTo])

    return (
        <AppIconButton
            mode='short'
            player={player}
            onClick={contactMe}
            tooltipText={$L('About Me?')}
            icon='info'
        />
    )
}

export const LogoutBtn = () => {
    const { jumpTo, pushHistory, goBack } = useNavigate()
    /** @type {[Boolean, Function]} */
    const [askExit, setAskExit] = useState(false)

    const doLogout = useCallback(async () => {
        await api.auth.logout()
        api.utils.clearCache()
        jumpTo('/login')
    }, [jumpTo])

    const askLogout = useCallback(() => {
        pushHistory(() => { setAskExit(false) })
        setAskExit(true)
    }, [pushHistory, setAskExit])

    return (
        <>
            <AppIconButton
                mode='short'
                onClick={askLogout}
                tooltipText={$L('Logout')}
                icon='arrowshrinkright'
            />
            <Alert open={askExit}
                title={$L('Logout')}
                message={$L('Are you sure you want to logout?')}
                onAccept={doLogout}
                onCancel={goBack} />
        </>
    )
}
