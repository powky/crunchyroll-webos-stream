import { useCallback, useEffect, useRef, useState } from 'react'
import Spotlight from '@enact/spotlight'
import Spottable from '@enact/spotlight/Spottable'
import Spinner from '@enact/moonstone/Spinner'
import PropTypes from 'prop-types'
import classNames from 'classnames'

import Icon from '../ui/Icons'
import Scroller from '../../patch/Scroller'
import { useNavigate } from '../../hooks/navigate'
import css from './SettingsList.module.less'


const SpottableDiv = Spottable('div')

/**
 * @typedef SettingsOption
 * @type {Object}
 * @property {String} value
 * @property {String} label
 *
 * @typedef SettingsRow
 * @type {Object}
 * @property {String} key
 * @property {String} label
 * @property {String} [icon]
 * @property {String} [value] current value (an option's value when `options` is set)
 * @property {Array<SettingsOption>} [options] opens a list to pick from
 * @property {Function} [onChange] receives the picked option's value
 * @property {Function} [onSelect] a plain action
 * @property {Boolean} [loading]
 * @property {String} [detail] text shown on the right instead of a value
 *
 * @typedef SettingsSection
 * @type {Object}
 * @property {String} title
 * @property {Array<SettingsRow>} rows
 */

/**
 * One row: label on the left, value and chevron on the right; white when focused, like tvOS's Settings
 */
const Row = ({ row, ...rest }) => {
    let right = row.detail
    if (row.options) {
        const option = row.options.find(opt => opt.value === row.value)
        right = option ? option.label : row.value
    }
    return (
        <SpottableDiv className={classNames('cr-own', css.row)} role='button' {...rest}>
            {row.icon && <Icon name={row.icon} className={css.icon} />}
            <span className={css.label}>{row.label}</span>
            {row.loading && <Spinner size='small' />}
            {!row.loading && right != null && <span className={css.value}>{right}</span>}
            {row.options && <Icon name='chevronRight' className={css.chevron} />}
        </SpottableDiv>
    )
}

/**
 * Grouped settings rows; a row with options drills into its list (Back returns)
 * @param {Object} obj
 * @param {Array<SettingsSection>} obj.sections
 */
const SettingsList = ({ sections }) => {
    const { pushHistory, popHistory } = useNavigate()
    /** @type {[String, Function]} key of the row whose options are open */
    const [openKey, setOpenKey] = useState(null)
    /** @type {{current: String}} row to focus again when coming back from its options */
    const returnKeyRef = useRef(null)
    const rows = sections.reduce((all, section) => all.concat(section.rows), [])
    const openRow = rows.find(row => row.key === openKey)

    const onRow = useCallback(ev => {
        const row = rows.find(item => item.key === ev.currentTarget.dataset.key)
        if (!row || row.loading) {
            return
        }
        if (row.options) {
            returnKeyRef.current = row.key
            pushHistory(() => setOpenKey(null))
            setOpenKey(row.key)
        } else if (row.onSelect) {
            row.onSelect()
        }
    }, [rows, pushHistory])

    const onOption = useCallback(ev => {
        const value = ev.currentTarget.dataset.value
        if (openRow && openRow.onChange) {
            openRow.onChange(value)
        }
        popHistory()
        setOpenKey(null)
    }, [openRow, popHistory])

    useEffect(() => {  // focus the chosen option on the way in, the row on the way out
        const timeout = setTimeout(() => {
            if (openKey) {
                if (!Spotlight.focus(`.${css.options} [data-selected="true"]`)) {
                    Spotlight.focus(`.${css.options} .${css.row}`)
                }
            } else if (returnKeyRef.current) {
                Spotlight.focus(`.${css.list} [data-key="${returnKeyRef.current}"]`)
            }
        }, 50)
        return () => clearTimeout(timeout)
    }, [openKey])

    return (
        <div className={css.settings}>
            {!openRow &&
                <Scroller direction='vertical' horizontalScrollbar='hidden' verticalScrollbar='hidden'
                    className={css.list}>
                    {sections.map(section => (
                        <div key={section.title} className={css.section}>
                            <h2 className={css.sectionTitle}>{section.title}</h2>
                            {section.rows.map(row => (
                                <Row key={row.key} row={row} data-key={row.key} onClick={onRow} />
                            ))}
                        </div>
                    ))}
                </Scroller>
            }
            {openRow &&
                <Scroller direction='vertical' horizontalScrollbar='hidden' verticalScrollbar='hidden'
                    className={classNames(css.list, css.options)}>
                    <h2 className={css.sectionTitle}>{openRow.label}</h2>
                    {openRow.options.map(option => (
                        <SpottableDiv key={option.value}
                            className={classNames('cr-own', css.row)}
                            role='button'
                            data-value={option.value}
                            data-selected={option.value === openRow.value}
                            onClick={onOption}>
                            <span className={css.label}>{option.label}</span>
                            {option.value === openRow.value && <Icon name='check' className={css.check} />}
                        </SpottableDiv>
                    ))}
                </Scroller>
            }
        </div>
    )
}

SettingsList.propTypes = {
    sections: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        rows: PropTypes.arrayOf(PropTypes.object).isRequired,
    })).isRequired,
}

export default SettingsList
