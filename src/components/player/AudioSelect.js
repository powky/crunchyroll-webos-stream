
import { useCallback } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import PropTypes from 'prop-types'

import AudioList from './AudioList'
import { usePlayerPopup } from '../../hooks/playerPopup'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)

/**
 * @param {Object} obj
 * @param {Array<import('./AudioList').Audio>} obj.audios
 * @param {import('./AudioList').Audio} [obj.audio]
 * @param {Function} obj.selectAudio
 * @param {Function} [obj.triggerActivity]
 */
const AudioSelect = ({ audios, audio, selectAudio, triggerActivity, ...rest }) => {
    const { open, toggle, close } = usePlayerPopup()

    const onSelectAudio = useCallback(({ selected }) => {
        selectAudio(selected)
        close()
    }, [close, selectAudio])

    const audioList = useCallback(() => (
        <AudioList
            audios={audios}
            audio={audio}
            onSelectAudio={onSelectAudio}
            triggerActivity={triggerActivity} />
    ), [audios, audio, onSelectAudio, triggerActivity])

    return (
        <IconButtonWithPopup
            backgroundOpacity="lightTranslucent"
            open={open}
            onClick={toggle}
            onClose={close}
            popupComponent={audioList}
            direction='up'
            {...rest}>
            audio
        </IconButtonWithPopup>
    )
}

AudioSelect.propTypes = {
    audios: PropTypes.arrayOf(PropTypes.object).isRequired,
    audio: PropTypes.object,
    selectAudio: PropTypes.func.isRequired,
    triggerActivity: PropTypes.func,
}

export default AudioSelect
