/**
 * @file Small header bar used by every step of the YouTube import flow
 * (URL → Trim → Save).
 *
 * Renders an optional back button, a title, and an optional subtitle.
 * The back button (arrow-left icon) is only rendered when `onBack` is
 * passed — used to navigate between steps.
 *
 * @see ./UrlStep.jsx — step 1
 * @see ./TrimStep.jsx — step 2
 * @see ./SaveStep.jsx — step 3
 */

/**
 * Page header with optional back button.
 *
 * @param {Object} props
 * @param {string} props.title - Main title (translated).
 * @param {string} [props.sub] - Subtitle below the title (translated).
 * @param {() => void} [props.onBack] - If provided, renders a back button.
 * @returns {JSX.Element}
 */
export default function PageHeader({ title, sub, onBack }) {
  return (
    <div style={{
      padding: '12px 20px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    }}>
      {onBack && (
        <button
          className="btn-ghost"
          onClick={onBack}
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
        >
          <i className="ti ti-arrow-left" />
        </button>
      )}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </div>
  )
}