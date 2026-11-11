
import { useCallback } from 'react'
import IconButton from '@enact/moonstone/IconButton'
import ContextualPopupDecorator from '@enact/moonstone/ContextualPopupDecorator'
import PropTypes from 'prop-types'

import SubtitleList from './SubtitleList'
import { usePlayerPopup } from '../../hooks/playerPopup'

const IconButtonWithPopup = ContextualPopupDecorator(IconButton)


/**
 * @param {Object} obj
 * @param {Array<import('./SubtitleList').Subtitle>} obj.subtitles
 * @param {import('./SubtitleList').Subtitle} [obj.subtitle]
 * @param {Function} obj.onSelectSubtitle
 * @param {Function} [obj.triggerActivity]
 */
const SubtitleSelect = ({ subtitles, subtitle, selectSubtitle, triggerActivity, ...rest }) => {
    const { open, toggle, close } = usePlayerPopup()

    const onSelectSubtitle = useCallback(({ selected }) => {
        selectSubtitle(selected)
        close()
    }, [selectSubtitle, close])

    const subtitleList = useCallback(() => (
        <SubtitleList
            subtitles={subtitles}
            subtitle={subtitle}
            onSelectSubtitle={onSelectSubtitle}
            triggerActivity={triggerActivity} />
    ), [subtitles, subtitle, onSelectSubtitle, triggerActivity])

    return (
        <IconButtonWithPopup
            backgroundOpacity="lightTranslucent"
            open={open}
            onClick={toggle}
            onClose={close}
            popupComponent={subtitleList}
            direction='up'
            {...rest}>
            sub
        </IconButtonWithPopup>
    )
}

SubtitleSelect.propTypes = {
    subtitles: PropTypes.arrayOf(PropTypes.object).isRequired,
    subtitle: PropTypes.object,
    selectSubtitle: PropTypes.func.isRequired,
    triggerActivity: PropTypes.func,
}

export default SubtitleSelect
