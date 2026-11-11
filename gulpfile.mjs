
import fs from 'fs'
import path from 'path'
import gulp from 'gulp'
import { createHash } from 'node:crypto'
import { deleteAsync } from 'del'
import { exec } from 'child_process'
import packageJson from './package.json' with { type: 'json' }
import appInfo from './webos-meta/appinfo.json' with { type: 'json' }
import ilibmanifest from './resources/ilibmanifest.json' with { type: 'json' }


function handleError(cb) {
    return (err, stdout, stderr) => {
        if (stdout) { console.log(stdout) }
        if (stderr) { console.log(stderr) }
        if (err) { console.error(err) }
        cb(err)
    }
}

function installAppTv(cb, tv) {
    const tvStr = tv && '-d tv1' || ''
    exec(`ares-install ${tvStr} bin/${appInfo.id}_${packageJson.version}_all.ipk`, handleError(cb))
}

function cleanIlib(cb) {
    try {
        const fakeManifest = './resources/global_ilibmanifes.json'
        const realManifest = './node_modules/ilib/locale/ilibmanifest.json'
        const content = fs.readFileSync(fakeManifest, 'utf8')
        fs.writeFileSync(realManifest, content, 'utf8')
    } catch (err) {
        return handleError(cb)(err)
    }
    try {
        const filePath = 'node_modules/ilib/locale/es/dateformats.json'
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        content.gregorian.date.dmy = {
            "f": "dd 'de' MMMM 'de' yyyy",
            "l": "dd 'de' MMMM 'de' yyyy",
            "m": "dd MMM yyyy",
            "s": "dd/MM/yy"
        }
        fs.writeFileSync(filePath, JSON.stringify(content), 'utf8')
    } catch (err) {
        return handleError(cb)(err)
    }
    try {
        const filePath = './node_modules/@enact/moonstone/VideoPlayer/VideoPlayer.js'
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        if (!fileContent.includes('crunchypatch')) {
            fileContent = fileContent.replace('_MediaSlider["default"], {',
                `_MediaSlider["default"], {
              duration: this.state.duration, // crunchypatch`
            );
            fileContent = fileContent.replace("'toggleControls']", "'toggleControls', 'activityDetected']");
            fs.writeFileSync(filePath, fileContent, 'utf-8')
        }
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        const filePath = './node_modules/@enact/moonstone/VideoPlayer/MediaSliderDecorator.js'
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        if (!fileContent.includes('crunchypatch')) {
            // init state
            fileContent = fileContent.replace('tracking: false,',
                `tracking: false,
          duration: 0, // crunchypatch`
            );
            // setState
            fileContent = fileContent.replace('tracking: true,',
                `tracking: true,
          duration: this.props.duration, // crunchypatch`
            );
            // decrement
            fileContent = fileContent.replace('var _decrement = function decrement(state) {',
                `
// crunchypatch
var _jumpBy = 5
var _jumpByResetTimeout = null
var _jumpByDirection = 0
var _getJumpBySeconds = function _getJumpBySeconds (direction) {
    _jumpBy = _jumpByDirection !== direction ? 5 : _jumpBy
    var out = _jumpBy
    var restFn = function restFn() { _jumpBy = 5 }
    clearTimeout(_jumpByResetTimeout)
    _jumpByDirection = direction
    if (_jumpBy <= 5) {
        // nothing
    } else if (_jumpBy <= 10) {
        _jumpByResetTimeout = setTimeout(restFn, 2 * 1000)
    } else {
        _jumpByResetTimeout = setTimeout(restFn, 5 * 1000)
    }
    _jumpBy = Math.min(_jumpBy << 1, 30)
    return out
}
var _decrement = function decrement(state) {  // crunchypatch
    if (state.tracking && state.x > 0) {
        var x = Math.max(0, state.x - (_getJumpBySeconds(-1) / state.duration))
        return { x }
    }`.trim()
            );
            // _increment
            fileContent = fileContent.replace('var _increment = function increment(state) {',
                `
var _increment = function increment(state) {  // crunchypatch
    if (state.tracking && state.x < 1) {
        const x = Math.min(1, state.x + (_getJumpBySeconds(1) / state.duration))
        return { x }
    }`.trim()
            );
            fs.writeFileSync(filePath, fileContent, 'utf-8')
        }
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        patchMoonstoneTheme()
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        const filePath = 'src/views/DeveloperPanel.js'
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        const versionLine = `                        <BodyText className='app-version'>{$L('Version') + ' ${packageJson.version}'} </BodyText>`
        fileContent = fileContent.replace(/^.*app-version.*$/m, versionLine);
        fs.writeFileSync(filePath, fileContent, 'utf-8')
    } catch (err) {
        return handleError(cb)(err)
    }

    try {
        exec('npx which enact', { encoding: 'utf-8' }, (err, cliPath) => {
            if (err) { throw err }
            cliPath = cliPath.split('/').slice(0, -2).join('/') + '/lib/node_modules/@enact/cli'
            if (!fs.existsSync(`${cliPath}/package.json`)) { return }  // enact cli not installed globally
            const packageContent = JSON.parse(fs.readFileSync(`${cliPath}/package.json`, 'utf8'))
            if (packageContent.version === '7.2.1') {
                /** @type {String} */
                let fileContent = fs.readFileSync(`${cliPath}/commands/serve.js`, 'utf-8')
                if (!fileContent.includes('compiler.hooks.failed')) {
                    fileContent = fileContent.replace('compiler.hooks.afterEmit.tapAsync', `
        compiler.hooks.failed.tap('EnactCLI', (err) => {
            devServer.invalidate();     // ← permite recargar
            console.error(err);      // ← muestra el error
        });
        compiler.hooks.afterEmit.tapAsync`
                    )
                    fs.writeFileSync(`${cliPath}/commands/serve.js`, fileContent, 'utf-8')
                }
            }
        })
    } catch (err) {
        return handleError(cb)(err)
    }

    cb()
}

/** rules added at the end of moonstone's own CSS modules, so they can use its local class names */
const APPEND_CSS = {
    'VideoPlayer/VideoPlayer.module.css': `
.videoPlayer .fullscreen .bottom::before {
  content: "";
  position: absolute;
  z-index: -1;
  left: -2.5rem;
  right: -2.5rem;
  bottom: -1.25rem;
  height: 23rem;
  background: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.42) 40%, rgba(0, 0, 0, 0.8) 100%);
  pointer-events: none;
  opacity: 1;
  transition: opacity 400ms ease;
  will-change: opacity;
}
.videoPlayer .fullscreen .bottom.hidden::before {
  opacity: 0;
}
.videoPlayer .fullscreen .bottom .infoFrame .titleFrame .title {
  font-weight: 600;
  font-size: 1.75rem;
  letter-spacing: -0.01em;
}
.videoPlayer .fullscreen .bottom .sliderFrame .bar,
.videoPlayer .fullscreen .bottom .sliderFrame .fill,
.videoPlayer .fullscreen .bottom .sliderFrame .load {
  border-radius: 40rem;
}`,
    'ContextualPopupDecorator/ContextualPopup.module.css': `
.contextualPopup:global(.moonstone) {
  filter: none;
}
.contextualPopup:global(.moonstone) .container {
  background-color: rgba(36, 36, 42, 0.66);
  -webkit-backdrop-filter: blur(1.25rem) saturate(1.6);
  backdrop-filter: blur(1.25rem) saturate(1.6);
  border-color: rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 0.5rem;
  box-shadow: 0 0.5rem 1.25rem rgba(0, 0, 0, 0.45);
}
.contextualPopup:global(.moonstone) .arrow {
  display: none;
}`,
    'Popup/Popup.module.css': `
.popup:global(.moonstone) {
  background-color: rgba(28, 28, 33, 0.97);
  border-radius: 1.25rem 1.25rem 0 0;
}`,
    'Notification/Notification.module.css': `
.notification {
  border-radius: 1.25rem;
  border-color: rgba(255, 255, 255, 0.08) !important;
}`,
    'Input/Input.module.css': `
.decorator:global(.moonstone) {
  background-color: rgba(255, 255, 255, 0.12);
  color: #f5f5f7;
  border-radius: 0.5rem;
}
.decorator:global(.moonstone) .input::-webkit-input-placeholder {
  color: rgba(235, 235, 245, 0.5);
}`,
    'MoonstoneDecorator/MoonstoneDecorator.module.css': `
:global(.spotlight-input-key) :global(.moonstone) :global(.spottable):not(:global(.cr-own)):focus,
:global(.spotlight-input-mouse) :global(.moonstone) :global(.spottable):not(:global(.cr-own)):focus {
  border-radius: 0.5rem;
}`,
    'Panels/Header.module.css': `
.header .title {
  font-weight: 800;
  letter-spacing: -0.03em;
}`,
    'Dialog/Dialog.module.css': `
.dialog:global(.moonstone) .titleWrapper {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}`,
    // tooltips: no bubble, just the button's name under it, like tvOS (short enough to fit under the bottom row,
    // or moonstone flips it above)
    'TooltipDecorator/Tooltip.module.css': `
.tooltip .tooltipArrow {
  display: none;
}
.tooltip .tooltipLabel,
.tooltip.below .tooltipLabel,
.tooltip:global(.moonstone) .tooltipLabel,
.tooltip:global(.moonstone-light) .tooltipLabel {
  margin-top: 0.25rem;
  padding: 0;
  border: none;
  border-radius: 0;
  background: none;
  color: rgba(245, 245, 247, 0.92);
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.2;
  text-shadow: 0 1px 0.25rem rgba(0, 0, 0, 0.7);
}`,
}

/**
 * Re-skin moonstone at build time: the app's own components draw the new look, but every moonstone widget left
 * (inputs, pickers, popups, the video player) picks up the same font and white focus with dark text. Moonstone ships
 * compiled CSS, so the colours are rewritten there; its LESS vars only reach the app's own LESS files.
 */
function patchMoonstoneTheme() {
    // every replacement below leaves text it no longer matches, so running it again changes nothing
    const moonDir = './node_modules/@enact/moonstone'
    // popups and contextual menus default to moonstone's light skin: same dark glass as the rest of the app
    for (const file of ['ContextualPopupDecorator/ContextualPopup.js', 'Popup/Popup.js']) {
        const filePath = path.join(moonDir, file)
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        fs.writeFileSync(filePath, fileContent.replace("defaultSkin: 'light'", "defaultSkin: 'dark'"), 'utf-8')
    }
    // tooltips show a while later and under the button: a hint for who lingers, not a bubble on every move
    const tooltipPath = path.join(moonDir, 'TooltipDecorator/TooltipDecorator.js')
    fs.writeFileSync(tooltipPath, fs.readFileSync(tooltipPath, 'utf-8')
        .replace('tooltipDelay: 500,', 'tooltipDelay: 1200,')
        .replace("tooltipPosition: 'above',", "tooltipPosition: 'below center',"), 'utf-8')
    const cssFiles = fs.readdirSync(moonDir, { recursive: true })
        .filter(file => file.endsWith('.css') && !file.includes('node_modules'))
    for (const file of cssFiles) {
        const filePath = path.join(moonDir, file)
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        fileContent = fileContent
            .replace(/font-family: "Moonstone";/g, 'font-family: "CR Inter", "Moonstone";')
            .replace(/font-family: "MuseoSans";/g, 'font-family: "CR Inter", "MuseoSans";')
            .replace(/#cf0652/gi, '#f5f5f7')
            .replace(/#f93881/gi, '#ff5e00')
            .replace(/rgba\(207, 6, 82, /g, 'rgba(245, 245, 247, ')
            .replace(/rgba\(58, 2, 23, /g, 'rgba(255, 255, 255, ')
        fileContent = fileContent.replace(/([^{}]+)\{([^{}]*)\}/g, (block, selector, body) => {
            // the focus fill is white now: text and icons on it turn dark
            if (selector.includes(':focus') || selector.includes(':active')) {
                body = body.replace(/(^|[;\s])color: (#fff|#ffffff|white);/gi, '$1color: #0b0b0e;')
            }
            // the app's SF Symbols font ("CR Icons", src/components/ui/Icons.js) covers LG's icon code points first
            if (!selector.includes('@font-face')) {
                body = body.replace(/font-family: "Moonstone Icons";/g, 'font-family: "CR Icons", "Moonstone Icons";')
                    .replace(/font-family: "LG Icons";/g, 'font-family: "CR Icons", "LG Icons";')
            }
            return `${selector}{${body}}`
        })
        if (/(Button|Dropdown)\.module\.css$/.test(file) && !file.includes('IconButton')) {
            fileContent = fileContent.replace(/border-radius: 0\.125rem;/g, 'border-radius: 40rem;')  // pills
        } else if (file.endsWith('Input.module.css')) {
            fileContent = fileContent.replace(/border-radius: 0\.125rem;/g, 'border-radius: 0.5rem;')
        }
        if (APPEND_CSS[file]) {
            // replace what an earlier run appended, so changes to APPEND_CSS reach node_modules
            const appended = fileContent.indexOf('\n/* crunchytheme */')
            if (appended >= 0) {
                fileContent = fileContent.slice(0, appended)
            }
            fileContent += `\n/* crunchytheme */\n${APPEND_CSS[file]}\n`
        }
        if (file.endsWith('MoonstoneDecorator.module.css')) {
            // the skin paints every focused spottable; the app's own components (class cr-own) draw their focus
            fileContent = fileContent
                .replace(/:global\(\.spottable\):focus/g, ':global(.spottable):not(:global(.cr-own)):focus')
                .replace(/:global\(\.spottable\):active/g, ':global(.spottable):not(:global(.cr-own)):active')
        }
        fs.writeFileSync(filePath, fileContent, 'utf-8')
    }

    const replaceVars = (filePath, vars) => {
        /** @type {String} */
        let fileContent = fs.readFileSync(filePath, 'utf-8')
        if (fileContent.includes('crunchytheme')) { return }
        for (const [name, value] of Object.entries(vars)) {
            const regex = new RegExp(`^(@${name}:\\s*)[^;]*;`, 'm')
            if (!regex.test(fileContent)) {
                throw new Error(`moonstone var ${name} not found in ${filePath}`)
            }
            fileContent = fileContent.replace(regex, `$1${value}; // crunchytheme`)
        }
        fs.writeFileSync(filePath, fileContent, 'utf-8')
    }
    replaceVars('./node_modules/@enact/moonstone/styles/colors.less', {
        'moon-accent': '#f5f5f7',
        'moon-bg-color': '#0b0b0e',
        'moon-text-color': '#d1d1d6',
        'moon-spotlight-text-color': '#0b0b0e',
        'moon-active-spotlight-border-color': '#8e8e93',
        'moon-button-text-color': '#f5f5f7',
        'moon-button-bg-color': '#2c2c31',
        'moon-progress-bar-fill-bg-color': '#ff5e00',
    })
    const font = '"CR Inter", "Moonstone"'
    replaceVars('./node_modules/@enact/moonstone/styles/variables.less', {
        'moon-font-family': font,
        'moon-font-family-light': font,
        'moon-font-family-small': font,
        'moon-font-family-bold': font,
        'moon-alt-font-family': font,
        'moon-button-border-radius': '999px',
    })
}

function copyIn18(cb) {
    try {
        const libs = ['i18n-iso-countries', 'i18n-iso-m49', '@cospired/i18n-iso-languages']
        for (const file of ilibmanifest.files) {
            const lang = file.split('/')[0]
            for (const lib of libs) {
                const jsonPath = `node_modules/${lib}/langs/${lang}.json`
                if (fs.existsSync(jsonPath)) {
                    const targetJsonPath = `./dist/${jsonPath}`
                    const targetDir = path.dirname(targetJsonPath)

                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true })
                    }
                    fs.copyFileSync(jsonPath, targetJsonPath)
                } else {
                    console.error('lang not found -> ' + jsonPath)
                }
            }
        }
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
}

function generateManifest(cb) {
    try {
        const ipkName = `${appInfo.id}_${appInfo.version}_all.ipk`
        if (!fs.existsSync(`./bin/${ipkName}`)) {
            throw new Error('ipk not found.')
        }
        const ikpFile = fs.readFileSync(`./bin/${ipkName}`)
        const hash = createHash('sha256')
        hash.update(ikpFile)

        const out = {
            id: appInfo.id,
            version: packageJson.version,
            type: 'web',
            title: appInfo.title,
            appDescription: packageJson.description,
            iconUri: 'https://raw.githubusercontent.com/ediaz23/crunchyroll-webos-stream/master/webos-meta/icon-large.png',
            sourceUrl: packageJson.repository,
            rootRequired: false,
            ipkUrl: ipkName,
            ipkHash: {
                sha256: hash.digest('hex')
            }
        }
        for (const key of Object.keys(out)) {
            if (!(out[key] != null)) {
                throw new Error(`key ${key} is not define`)
            }
        }
        if (!out.ipkHash.sha256) {
            throw new Error('key sha256 is not define')
        }
        fs.writeFileSync('./bin/org.webosbrew.manifest.json', JSON.stringify(out, null, '    '), { encoding: 'utf-8' })
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
}

function updateAppInfo(cb) {
    try {
        if (packageJson.version !== appInfo.version) {
            appInfo.version = packageJson.version
        }
        fs.writeFileSync('./webos-meta/appinfo.json', JSON.stringify(appInfo, null, '    ') + '\n',
            { encoding: 'utf-8' })
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
}


gulp.task('clean-ilib', cleanIlib)

gulp.task('gulp-postinstall', gulp.series('clean-ilib'))

gulp.task('copy-in18', copyIn18)

gulp.task('license', cb => {
    try {
        fs.copyFileSync('./LICENSE', './bin/LICENSE')
        cb()
    } catch (err) {
        handleError(cb)(err)
    }
})

gulp.task('manifest', generateManifest)

gulp.task('clean', () =>
    deleteAsync('bin/**', { force: true })
        .then(deleteAsync('dist/**', { force: true }))
)

gulp.task('pack', cb => { exec('npm run pack', handleError(cb)) })
gulp.task('pack-p', cb => { exec('npm run pack-p', handleError(cb)) })
// webpack agrega __webpack_require__ al código, lo más fácil fue limpiarlo así.
gulp.task('pack-p-fix', cb => {
    exec(`
        for f in dist/chunk*.js;
        do
            sed -i 's/__webpack_require__\.ilib_cache_id="[^"]*";//g' "$f";
        done`.trim(),
        handleError(cb)
    )
})

gulp.task('installService', cb => { exec('NODE_ENV=development npm ci --prefix=./service', handleError(cb)) })

gulp.task('buildService', cb => { exec('npm run build --prefix=./service', handleError(cb)) })
gulp.task('buildService-p', cb => { exec('npm run build-p --prefix=./service', handleError(cb)) })

gulp.task('app', cb => { exec('ares-package --no-minify dist/ ./service/dist -o bin/', handleError(cb)) })
gulp.task('app-p', cb => { exec('ares-package dist/ ./service/dist -o bin/', handleError(cb)) })

gulp.task('install-app-tv1', cb => { installAppTv(cb, true) })
gulp.task('install-app', cb => { installAppTv(cb, false) })

gulp.task('cleanService', () => deleteAsync('service/dist/**', { force: true }))

gulp.task('update-appinfo', updateAppInfo)

gulp.task('build', gulp.series('clean', 'update-appinfo', 'pack', 'copy-in18'));
gulp.task('build-service', gulp.series('installService', 'buildService'))

gulp.task('build-dev', gulp.series('clean', 'update-appinfo', 'pack', 'copy-in18',
    'installService', 'buildService', 'app', 'cleanService'));

gulp.task('build-p', gulp.series('clean', 'update-appinfo', 'pack-p', 'copy-in18',
    'installService', 'buildService-p', 'app-p', 'cleanService', 'manifest', 'license'));

export default gulp
