
import IconButton from '@enact/moonstone/IconButton'
import Image from '@enact/moonstone/Image'
import PropTypes from 'prop-types'

import { $L } from '../../hooks/language'
import css from './Profile.module.less'
import withNavigable from '../../hooks/navigable'
import api from '../../api'
import kidImg from '../../../assets/img/child.jpg'


const ImageNavigable = withNavigable(Image, css.profileFocus)

/**
 * @param {Object} obj
 * @param {import('crunchyroll-js-api').Types.Profile} obj.profile
 * @param {Function} obj.onSelectProfile
 * @param {Function} obj.onEditProfile
 * @param {Function} obj.compRef
 * @param {Object} obj.rest
 */
const Profile = ({ profile, onSelectProfile, onEditProfile, compRef, ...rest }) => {

    return (
        <div className={css.profile} {...rest}>
            <ImageNavigable
                data-profile-id={profile.profile_id}
                className={`cr-own ${css.profileImg}`}
                src={profile.avatar && api.assets.getAvatarUrl(profile.avatar) || kidImg}
                alt={$L('Profile Picture')}
                onClick={onSelectProfile}
                ref={compRef} />
            <div className={css.name}>{profile.profile_name}</div>
            <IconButton data-profile-id={profile.profile_id}
                className={css.editButton}
                size='small'
                backgroundOpacity='transparent'
                onClick={onEditProfile}>
                edit
            </IconButton>
        </div>
    )
}

Profile.propTypes = {
    profile: PropTypes.object.isRequired,
    onSelectProfile: PropTypes.func.isRequired,
    onEditProfile: PropTypes.func.isRequired,
    compRef: PropTypes.func.isRequired,
}

export default Profile
