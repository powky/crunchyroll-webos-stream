
import { useCallback, useEffect, useState, useRef } from 'react'
import { Panel } from '@enact/moonstone/Panels'
import classNames from 'classnames'

import { useSetRecoilState, useRecoilState } from 'recoil'

import { LoginWithEmail, LoginWithCode, LoginWithQR } from '../components/login/Login'
import { ContactMeBtn, AppConfigBtn } from '../components/Buttons'
import PopupMessage from '../components/Popup'
import PillButton from '../components/ui/PillButton'
import ProfilesSkeleton from '../components/profile/ProfilesSkeleton'
import logo from '../../assets/img/crunchyroll-logo.svg'
import { autoLoginState, isPremiumState } from '../recoilConfig'
import api from '../api'
import { $L } from '../hooks/language'
import { useNavigate } from '../hooks/navigate'
import logger from '../logger'
import css from '../components/login/Login.module.less'
import cssProfiles from '../components/profile/Profile.module.less'


const ActivityViews = ({ index, children }) => children[index]

const LoginPanel = ({ ...rest }) => {
    const { jumpTo } = useNavigate()
    /** @type {Function} */
    const setPremiumState = useSetRecoilState(isPremiumState)
    /** @type {[Boolean, Function]}  */
    const [autoLogin, setAutoLogin] = useRecoilState(autoLoginState)
    /** @type {[String, Function]}  */
    const [message, setErrorMessage] = useState('')
    /** @type {[Number, Function]} */
    const [currentIndex, setCurrentIndex] = useState(0)
    /** @type {[String, Function]} */
    const [deviceCode, setDeviceCode] = useState(null)
    /** @type {{current: import('crunchyroll-js-api').Types.DeviceCode}} */
    const deviceRef = useRef(null)
    /** @type {[Boolean, Function]} a saved session is being checked: the profile picker's skeleton shows, not the form */
    const [checking, setChecking] = useState(autoLogin)

    /** @type {Function} */
    const makeLogin = useCallback(async () => {
        await api.auth.login()
        const account = await api.account.getAccount()
        const benefits = await api.subscription.getUserBenefits(account)
        for (const item of benefits.items) {
            if (item.benefit === 'cr_premium') {
                setPremiumState(true)
                break
            }
        }
        setAutoLogin(true)
        jumpTo('/profiles')
    }, [setAutoLogin, setPremiumState, jumpTo])

    /** @type {Function} */
    const setView = useCallback(ev => {
        const target = ev.currentTarget || ev.target
        setCurrentIndex(parseInt(target.dataset.index))
    }, [])

    /** @type {Function} */
    const onError = useCallback(error => {
        logger.error(error)
        setErrorMessage(error.message || error.code)
        deviceRef.current = null
        setCurrentIndex(0)
    }, [setErrorMessage, setCurrentIndex])

    useEffect(() => {
        let timeout = null
        let interval = null
        if (currentIndex >= 1) {
            setDeviceCode(null)
            const startLogin = async () => {
                try {
                    if (deviceRef.current) {
                        const now = new Date()
                        const diff = (now.getTime() - new Date(deviceRef.current.created_date).getTime()) / 1000
                        if (diff >= (deviceRef.current.expires_in - 15)) {
                            deviceRef.current = null
                        }
                    }
                    if (!deviceRef.current) {
                        deviceRef.current = await api.auth.getDeviceCode()
                    }
                    setDeviceCode(deviceRef.current.user_code)
                    timeout = setTimeout(() => {
                        deviceRef.current = null
                        clearTimeout(interval)
                        startLogin()
                    }, deviceRef.current.expires_in * 1000)
                    interval = setInterval(() => {
                        api.auth.getDeviceAuth(deviceRef.current.device_code).then(res => {
                            if (res) {
                                clearInterval(interval)
                                clearTimeout(timeout)
                                return makeLogin()
                            }
                        }).catch(onError)
                    }, deviceRef.current.interval)
                } catch (error) {
                    onError(error)
                }
            }
            startLogin()
        }
        return () => {
            clearTimeout(timeout)
            clearInterval(interval)
        }
    }, [currentIndex, onError, makeLogin])

    useEffect(() => {
        return () => { deviceRef.current = null }
    }, [])

    useEffect(() => {  // signed in before: straight on to the profiles; the login form only shows if that fails
        let active = true
        const checkSession = async () => {
            try {
                if (await api.auth.getSession()) {
                    await makeLogin()
                    return
                }
            } catch (error) {
                logger.error(error)
            }
            if (active) {
                setChecking(false)
            }
        }
        if (checking) {
            checkSession()
        }
        return () => { active = false }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (checking) {
        return (
            <Panel {...rest} className={classNames(rest.className, cssProfiles.profilesPanel)}>
                <ProfilesSkeleton />
            </Panel>
        )
    }

    return (
        <Panel {...rest} className={classNames(rest.className, css.loginPanel)}>
            <div className={css.corner}>
                <AppConfigBtn />
                <ContactMeBtn />
            </div>
            <div className={css.center}>
                <img className={css.logo} src={logo} alt='Crunchyroll' />
                <h1 className={css.title}>{$L('Login')}</h1>
                <div className={css.segmented}>
                    <PillButton small plain icon='mail' data-index='0' selected={currentIndex === 0} onClick={setView}>
                        {$L('Email')}
                    </PillButton>
                    <PillButton small plain icon='key' data-index='1' selected={currentIndex === 1} onClick={setView}>
                        {$L('Code')}
                    </PillButton>
                    <PillButton small plain icon='qr' data-index='2' selected={currentIndex === 2} onClick={setView}>
                        {$L('QR code')}
                    </PillButton>
                </div>
                <ActivityViews index={currentIndex}>
                    <LoginWithEmail
                        makeLogin={makeLogin}
                        setErrorMessage={setErrorMessage}
                    />
                    <LoginWithCode deviceCode={deviceCode} />
                    <LoginWithQR deviceCode={deviceCode} />
                </ActivityViews>
            </div>
            <PopupMessage show={!!message} type='error'>
                {message}
            </PopupMessage>
        </Panel>
    )
}

export default LoginPanel
