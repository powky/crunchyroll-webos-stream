
import { useCallback, useEffect, useState } from 'react'
import Spotlight from '@enact/spotlight'
import { Panel } from '@enact/moonstone/Panels'
import classNames from 'classnames'
import { useSetRecoilState } from 'recoil'

import { $L } from '../hooks/language'
import { currentProfileState, homeViewReadyState } from '../recoilConfig'
import Profile from '../components/profile/Profile'
import PillButton from '../components/ui/PillButton'
import { Bone, Skeleton } from '../components/ui/Skeleton'
import css from '../components/profile/Profile.module.less'
import { ContactMeBtn, LogoutBtn, AppConfigBtn } from '../components/Buttons'
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

    useEffect(() => {
        if (DEV_FAST_SELECT && multiProfile && multiProfile.profiles.length) {
            doSelectProfile(multiProfile.profiles[0])
        }
    }, [multiProfile, doSelectProfile])

    useEffect(() => {
        api.account.getProfiles().then(setMultiProfile)
    }, [])

    useEffect(() => {  // nothing is focused at first: the first key goes to the first profile (spotlight would pick by
        // pointer position, the top-left corner)
        const onKeyDown = (ev) => {
            if (!Spotlight.getCurrent() && [13, 37, 38, 39, 40].includes(ev.keyCode)) {
                const first = document.querySelector('[data-profile-id].spottable-default')
                if (first) {
                    ev.preventDefault()
                    ev.stopPropagation()
                    Spotlight.focus(first)
                }
            }
        }
        window.addEventListener('keydown', onKeyDown, true)
        return () => window.removeEventListener('keydown', onKeyDown, true)
    }, [])

    return (
        <Panel {...rest} autoFocus='none' className={classNames(rest.className, css.profilesPanel)}>
            <div className={css.corner}>
                <AppConfigBtn />
                <ContactMeBtn />
                <LogoutBtn />
            </div>
            {!loading && multiProfile && multiProfile.profiles.length ?
                <div className={css.center}>
                    <h1 className={css.title}>{$L('Who will go on an adventure?')}</h1>
                    {/* nothing is focused until a key is pressed: the first press lands on the first profile */}
                    <div className={classNames(css.profiles, { [css.many]: multiProfile.profiles.length > 3 })}>
                        {multiProfile.profiles.map((profile, i) =>
                            <Profile profile={profile} key={i}
                                isDefault={i === 0}
                                onSelectProfile={onSelectProfile}
                                onEditProfile={onEditProfile} />
                        )}
                    </div>
                    <div className={css.footer}>
                        {multiProfile.profiles.length < multiProfile.tier_max_profiles &&
                            <PillButton icon='plus' onClick={onCreateProfile}>
                                {$L('Add')}
                            </PillButton>
                        }
                    </div>
                </div>
                :
                <Skeleton className={css.center}>
                    <Bone w={620} h={60} r={12} />
                    <div className={css.profiles}>
                        {[0, 1, 2].map(i => (
                            <div key={i} className={css.profile}>
                                <Bone w={300} h={300} r='50%' />
                                <Bone w={120} h={28} r={8} style={{ marginTop: 30 }} />
                            </div>
                        ))}
                    </div>
                </Skeleton>
            }
        </Panel>
    )
}

export default ProfilesPanel
