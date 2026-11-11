
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import PillButton from '../ui/PillButton'
import { $L } from '../../hooks/language'
import css from './Profile.module.less'
import withNavigable from '../../hooks/navigable'
import api from '../../api'
import { useStoredImage } from '../../hooks/imageStore'
import kidImg from '../../../assets/img/child.jpg'


const ImageNavigable = withNavigable(Image, css.profileFocus)

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.onSelectProfile
 * @param {Function} obj.onEditProfile
 * @param {Boolean} [obj.isDefault] where the first key press lands (nothing is focused before)
 * @param {Object} obj.rest
 */
const Profile = ({ profile, onSelectProfile, onEditProfile, isDefault, ...rest }) => {
    const avatarSrc = useStoredImage(profile.avatar ? api.assets.getAvatarUrl(profile.avatar) : null)

    return (
        <div className={css.profile} {...rest}>
            <ImageNavigable
                data-profile-id={profile.profile_id}
                className={`cr-own ${css.profileImg}${isDefault ? ' spottable-default' : ''}`}
                src={profile.avatar ? avatarSrc : kidImg}
                alt={$L('Profile Picture')}
                onClick={onSelectProfile} />
            <div className={css.nameRow}>
                <div className={css.name}>{profile.profile_name}</div>
                <PillButton small round plain
                    data-profile-id={profile.profile_id}
                    className={css.editButton}
                    icon='edit'
                    aria-label={$L('Edit')}
                    onClick={onEditProfile} />
            </div>
        </div>
    )
}

Profile.propTypes = {
    profile: PropTypes.object.isRequired,
    onSelectProfile: PropTypes.func.isRequired,
    onEditProfile: PropTypes.func.isRequired,
    isDefault: PropTypes.bool,
}

export default Profile
