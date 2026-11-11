import { useEffect, useState } from 'react'
import SpotlightContainerDecorator from '@enact/spotlight/SpotlightContainerDecorator'
import PropTypes from 'prop-types'

import PillButton from '../ui/PillButton'
import logo from '../../../assets/img/crunchyroll-logo.svg'
import api from '../../api'
import { useStoredImage } from '../../hooks/imageStore'
import kidImg from '../../../assets/img/child.jpg'
import css from './TopNav.module.less'


/** tabs drawn as icons only, at the end of the bar */
const ICON_TABS = { search: 'search', config: 'gear', info: 'info', close: 'power' }

/** minutes resolution: one repaint a minute, of the clock's own small layer */
const Clock = () => {
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
    const hours = `${now.getHours()}`.padStart(2, '0')
    const minutes = `${now.getMinutes()}`.padStart(2, '0')
    return <div className={css.clock}>{`${hours}:${minutes}`}</div>
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
    const textTabs = items.filter(item => !ICON_TABS[item.key])
    const iconTabs = items.filter(item => ICON_TABS[item.key])
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
                <img className={css.avatar} src={avatar} alt='' />
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
