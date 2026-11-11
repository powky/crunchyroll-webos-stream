
import { useCallback, useEffect, useState } from 'react'
import Spotlight from '@enact/spotlight'
import { Panel } from '@enact/moonstone/Panels'
import Spinner from '@enact/moonstone/Spinner'
import classNames from 'classnames'
import { useSetRecoilState } from 'recoil'

import { $L } from '../hooks/language'
import { currentProfileState, homeViewReadyState } from '../recoilConfig'
import Profile from '../components/profile/Profile'
import PillButton from '../components/ui/PillButton'
import css from '../components/profile/Profile.module.less'
import { ContactMeBtn, DevBtn, LogoutBtn, AppConfigBtn } from '../components/Buttons'
import api from '../api'
import { DEV_FAST_SELECT } from '../const'
import { useNavigate, useResetHomeState } from '../hooks/navigate'


const ProfilesPanel = ({ ...rest }) => {
    const { goTo } = useNavigate()
    /** @type {Function} */
    const setCurrentProfile = useSetRecoilState(currentProfileState)
    /** @type {[import('crunchyroll-js-api').Types.ProfileResponse, Function]}  */
    const [multiProfile, setMultiProfile] = useState(null)
    /** @type {Function} */
    const setHomeViewReady = useSetRecoilState(homeViewReadyState)
    /** @type {[Boolean, Function]}  */
    const [loading, setLoading] = useState(false)
    /** @type {Function} */
    const resetHomeState = useResetHomeState()

    /** @type {Function} */
    const getProfileFromEvent = useCallback((event) => {
        /** @type {HTMLElement} */
        const parentElement = event.target.closest('[data-profile-id]')
        const profileId = parentElement.getAttribute('data-profile-id')
        return multiProfile.profiles.find(p => p.profile_id === profileId)
    }, [multiProfile])

    /** @type {Function} */
    const doSelectProfile = useCallback(profile => {
        setLoading(true)
        api.utils.clearCache()
        api.auth.switchProfile(profile.profile_id).then(() => {
            setLoading(false)
            setHomeViewReady(false)
            setCurrentProfile(profile)
            resetHomeState()
            goTo('/profiles/home')
        })
    }, [setCurrentProfile, goTo, resetHomeState, setHomeViewReady, setLoading])

    /** @type {Function} */
    const onSelectProfile = useCallback(event => {
        doSelectProfile(getProfileFromEvent(event))
    }, [getProfileFromEvent, doSelectProfile])

    /** @type {Function} */
    const onEditProfile = useCallback(event => {
        const mainProfile = multiProfile.profiles.find(p => p.is_primary)
        setCurrentProfile({
            ...getProfileFromEvent(event),
            email: mainProfile.email,
        })
        goTo('/profiles/edit')
    }, [multiProfile, getProfileFromEvent, setCurrentProfile, goTo])

    /** @type {Function} */
    const onCreateProfile = useCallback(() => {
        const mainProfile = multiProfile.profiles.find(p => p.is_primary)
        setCurrentProfile({
            ...mainProfile,
            is_primary: false,
            profile_id: null,
            profile_name: ''
        })
        goTo('/profiles/edit')
    }, [multiProfile, setCurrentProfile, goTo])

    /** @type {Function} */
    const setFocus = useCallback(ev => {
        if (ev && ev.node && multiProfile && multiProfile.profiles.length) {
            if (ev.node.dataset.profileId === multiProfile.profiles[0].profile_id) {
                ev.node.focus()
                Spotlight.focus(ev.node)
            }
        }
    }, [multiProfile])

    useEffect(() => {
        if (DEV_FAST_SELECT && multiProfile && multiProfile.profiles.length) {
            doSelectProfile(multiProfile.profiles[0])
        }
    }, [multiProfile, doSelectProfile])

    useEffect(() => {
        api.account.getProfiles().then(setMultiProfile)
    }, [])

    return (
        <Panel {...rest} className={classNames(rest.className, css.profilesPanel)}>
            <div className={css.corner}>
                <AppConfigBtn />
                <ContactMeBtn />
                <LogoutBtn />
            </div>
            {!loading && multiProfile && multiProfile.profiles.length ?
                <div className={css.center}>
                    <h1 className={css.title}>{$L('Who will go on an adventure?')}</h1>
                    <div className={css.profiles}>
                        {multiProfile.profiles.map((profile, i) =>
                            <Profile profile={profile} key={i}
                                onSelectProfile={onSelectProfile}
                                onEditProfile={onEditProfile}
                                compRef={setFocus} />
                        )}
                    </div>
                    <div className={css.footer}>
                        {multiProfile.profiles.length < multiProfile.tier_max_profiles &&
                            <PillButton icon='plus' onClick={onCreateProfile}>
                                {$L('Add')}
                            </PillButton>
                        }
                        <AppConfigBtn mode='full' />
                        <DevBtn />
                    </div>
                </div>
                :
                <div className={css.loading}>
                    <Spinner />
                </div>
            }
        </Panel>
    )
}

export default ProfilesPanel
