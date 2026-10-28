/**
 * @file Option row (label + optional sub + control on the right).
 *
 * Used everywhere in the Options page to lay out a labeled setting with
 * its control (`Toggle`, `ShortcutRecorder`, `select`, button, etc.).
 *
 * @see ./Section.jsx
 */

/**
 * Option row.
 *
 * @param {Object} props
 * @param {string} props.label - Already-translated label.
 * @param {string} [props.sub] - Optional secondary text (description).
 * @param {React.ReactNode} [props.children] - The control on the right.
 * @returns {JSX.Element}
 */
export default function OptionRow({ label, sub, children }) {
  return (
    <div className="option-row">
      <div>
        <div className="label">{label}</div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {children}
    </div>
  )
}