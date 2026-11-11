import { useCallback } from 'react'
import PropTypes from 'prop-types'

import { useRecoilValue } from 'recoil'

import { categoriesState } from '../../recoilConfig'

import PillButton from '../ui/PillButton'
import PillRow from '../ui/PillRow'


/**
 * Genres as a row of pills under the search field; choosing one filters the grid
 * @param {Object} obj
 * @param {String} obj.category
 * @param {Function} obj.setCategory
 * @param {Function} obj.setDelay
 */
const CategoryList = ({ category, setCategory, setDelay, className }) => {
    /** @type {Array<{id: String, title: String}>} */
    const categories = useRecoilValue(categoriesState)

    const selectCategory = useCallback((ev) => {
        const id = ev.currentTarget.dataset.category
        if (id) {
            setCategory(id)
            setDelay({ delay: 100, scroll: true })
        }
    }, [setCategory, setDelay])

    return (
        <PillRow className={className}>
            {categories.map(categ => (
                <PillButton small plain key={categ.id}
                    data-category={categ.id}
                    data-pill-selected={category === categ.id}
                    selected={category === categ.id}
                    onClick={selectCategory}>
                    {categ.title}
                </PillButton>
            ))}
        </PillRow>
    )
}

CategoryList.propTypes = {
    category: PropTypes.string.isRequired,
    setCategory: PropTypes.func.isRequired,
    setDelay: PropTypes.func.isRequired,
    className: PropTypes.string,
}

export default CategoryList
