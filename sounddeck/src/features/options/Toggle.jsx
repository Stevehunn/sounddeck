/**
 * @file Toggle switch (used for boolean settings).
 *
 * Pure presentational component: the parent owns the `value` and the
 * `onChange` handler. No internal state.
 *
 * @see @shared/styles/index.css (`.toggle` / `.knob` classes)
 */

/**
 * Toggle switch.
 *
 * @param {Object} props
 * @param {boolean} props.value
 * @param {(v: boolean) => void} props.onChange - Called with `!value`.
 * @returns {JSX.Element}
 */
export default function Toggle({ value, onChange }) {
  return (
    <div
      className={`toggle ${value ? 'active' : ''}`}
      onClick={() => onChange(!value)}
    >
      <div className="knob" />
    </div>
  )
}