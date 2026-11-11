/* global ENACT_PACK_ISOMORPHIC */
import { createRoot, hydrateRoot } from 'react-dom/client'
import { RecoilRoot, useRecoilValue } from 'recoil'
import ilib from 'ilib'
import App from './App'
import { uiLanguageState } from './recoilConfig'
import './theme/global.less'
import { injectIconFont } from './components/ui/Icons'
import reportWebVitals from './reportWebVitals'

injectIconFont()

/** the TV's own locale, kept before any change, for the "automatic" language setting */
const systemLocale = ilib.getLocale()

/** Enact's i18n follows the `locale` prop; the language setting lives in recoil (localStorage) */
const LocalizedApp = () => {
    const language = useRecoilValue(uiLanguageState)
    return <App locale={language && language !== 'auto' ? language : systemLocale} />
}

const appElement = (<RecoilRoot> <LocalizedApp /> </RecoilRoot>)

// In a browser environment, render instead of exporting
if (typeof window !== 'undefined') {
    if (ENACT_PACK_ISOMORPHIC) {
        hydrateRoot(document.getElementById('root'), appElement)
    } else {
        createRoot(document.getElementById('root')).render(appElement)
    }
}

export default appElement

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint.
// Learn more: https://github.com/enactjs/cli/blob/master/docs/measuring-performance.md
reportWebVitals()
