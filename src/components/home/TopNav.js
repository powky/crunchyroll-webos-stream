import { useCallback, useEffect, useState } from 'react'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import Spottable from '@enact/spotlight/Spottable'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import { useRecoilValue } from 'recoil'
import PropTypes from 'prop-types'

import PillButton from '../ui/PillButton'
import logo from '../../../assets/img/crunchyroll-logo.svg'
import api from '../../api'
import { $L } from '../../hooks/language'
import { useStoredImage } from '../../hooks/imageStore'
import { usePopupMenu } from '../../hooks/popupMenu'
import { clockFormatState, hiddenTabsState } from '../../recoilConfig'
import kidImg from '../../../assets/img/child.jpg'
import css from './TopNav.module.less'


/** the bar ends with the search icon; settings, about and exit are in the avatar's menu */
const ICON_TABS = { search: 'search' }
/** the avatar menu's entries: tab key -> icon and label */
const MENU_TABS = {
    config: { icon: 'gear', label: () => $L('Settings') },
    info: { icon: 'info', label: () => $L('About') },
    close: { icon: 'power', label: () => $L('Exit') },
}

const AvatarButton = ContextualPopupDecorator(Spottable('div'))

/** minutes resolution: one repaint a minute, of the clock's own small layer */
const Clock = () => {
    /** @type {'24'|'12'} */
    const format = useRecoilValue(clockFormatState)
    const [now, setNow] = useState(new Date())
    useEffect(() => {
        let interval = null
        const timeout = setTimeout(() => {
            setNow(new Date())
            interval = setInterval(() => setNow(new Date()), 60 * 1000)
        }, (60 - now.getSeconds()) * 1000)
        return () => {
            clearTimeout(timeout)
            clearInterval(interval)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps
    const minutes = `${now.getMinutes()}`.padStart(2, '0')
    if (format === '12') {
        const hours = now.getHours() % 12 || 12
        return (
            <div className={css.clock}>
                {`${hours}:${minutes}`}
                <span className={css.ampm}>{now.getHours() < 12 ? $L('AM') : $L('PM')}</span>
            </div>
        )
    }
    return <div className={css.clock}>{`${`${now.getHours()}`.padStart(2, '0')}:${minutes}`}</div>
}

/**
 * The profile's avatar, as a button: opens a small menu with the settings, about and exit
 * @param {Object} obj
 * @param {String} obj.src
 * @param {Array<{key: String, index: Number}>} obj.items
 * @param {Function} obj.onClick gets the chosen entry's event (its tab index in `data-index`)
 */
const AvatarMenu = ({ src, items, onClick }) => {
    const { open, toggle, close } = usePopupMenu()

    const choose = useCallback((ev) => {
        close()
        onClick(ev)
    }, [close, onClick])

    const menu = useCallback(() => (
        <div className={css.menu}>
            {items.map(item => (
                <PillButton plain key={item.key}
                    className={css.menuItem}
                    icon={MENU_TABS[item.key].icon}
                    data-index={item.index}
                    onClick={choose}>
                    {MENU_TABS[item.key].label()}
                </PillButton>
            ))}
        </div>
    ), [items, choose])

    return (
        <AvatarButton
            className={`cr-own ${css.avatarButton}`}
            role='button'
            aria-label={$L('Settings')}
            open={open}
            onClick={toggle}
            onClose={close}
            popupComponent={menu}
            direction='down'
            spotlightRestrict='self-only'>
            <img className={css.avatar} src={src} alt='' />
        </AvatarButton>
    )
}

AvatarMenu.propTypes = {
    src: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    onClick: PropTypes.func.isRequired,
}

/**
 * Tab bar across the top of the home screen (replaces the old side toolbar)
 * @param {Object} obj
 * @param {Array<{key: String, icon: String, label: String}>} obj.toolbarList
 * @param {Number} obj.currentIndex
 * @param {Function} obj.onClick receives the event, the tab's index is in `data-index`
 * @param {import('crunchyroll-js-api').Types.Profile} [obj.profile]
 */
const TopNavBase = ({ toolbarList, currentIndex, onClick, profile, ...rest }) => {
    const items = toolbarList.map((item, index) => ({ ...item, index }))
    /** @type {Array<String>} */
    const hiddenTabs = useRecoilValue(hiddenTabsState)
    const textTabs = items.filter(item => !ICON_TABS[item.key] && !MENU_TABS[item.key] &&
        (!hiddenTabs.includes(item.key) || item.index === currentIndex))
    const iconTabs = items.filter(item => ICON_TABS[item.key])
    const menuTabs = items.filter(item => MENU_TABS[item.key])
    const storedAvatar = useStoredImage(profile && profile.avatar ? api.assets.getAvatarUrl(profile.avatar) : null)
    const avatar = profile && profile.avatar ? storedAvatar : kidImg

    return (
        <div className={css.topNav} {...rest}>
            <div className={css.brand}>
                <img className={css.logo} src={logo} alt='Crunchyroll' />
            </div>
            <div className={css.tabs}>
                {textTabs.map(item => (
                    <PillButton small plain
                        key={item.key}
                        data-index={item.index}
                        data-tab-selected={item.index === currentIndex}
                        selected={item.index === currentIndex}
                        onClick={onClick}>
                        {item.label}
                    </PillButton>
                ))}
                {iconTabs.map(item => (
                    <PillButton small round plain
                        key={item.key}
                        icon={ICON_TABS[item.key]}
                        aria-label={item.label}
                        data-index={item.index}
                        data-tab-selected={item.index === currentIndex}
                        selected={item.index === currentIndex}
                        onClick={onClick} />
                ))}
            </div>
            <div className={css.right}>
                <Clock />
                <AvatarMenu src={avatar} items={menuTabs} onClick={onClick} />
            </div>
        </div>
    )
}

TopNavBase.propTypes = {
    toolbarList: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        icon: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
    })).isRequired,
    currentIndex: PropTypes.number.isRequired,
    onClick: PropTypes.func.isRequired,
    profile: PropTypes.object,
}

/** coming up from the page lands on the current tab */
const TopNav = SpotlightContainerDecorator({
    enterTo: 'default-element',
    defaultElement: '[data-tab-selected="true"]',
}, TopNavBase)

export default TopNav
