import PropTypes from 'prop-types'

import { Bone, Skeleton } from '../ui/Skeleton'
import css from './Profile.module.less'


/**
 * The profile picker while it loads: title and three profiles, where the real ones will be (also shown at launch
 * while a saved session is checked, since the picker comes next)
 * @param {Object} obj
 * @param {String} [obj.className]
 */
const ProfilesSkeleton = ({ className }) => (
    <Skeleton className={className ? `${css.center} ${className}` : css.center}>
        <Bone w={620} h={60} r={12} />
        <div className={css.profiles}>
            {[0, 1, 2].map(i => (
                <div key={i} className={css.profile}>
                    <Bone w={300} h={300} r='50%' />
                    <Bone w={140} h={34} r={8} style={{ marginTop: 40 }} />
                </div>
            ))}
        </div>
        <Bone w={150} h={64} r={64} style={{ marginTop: 72 }} />
    </Skeleton>
)

ProfilesSkeleton.propTypes = {
    className: PropTypes.string,
}

export default ProfilesSkeleton
