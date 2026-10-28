/**
 * @file Section header with icon + count.
 *
 * Used by `Home` to wrap sound groups (favorites, profile sounds, other
 * sounds) with a consistent header.
 *
 * @see ./Home.jsx
 */

/**
 * Section wrapper.
 *
 * @param {Object} props
 * @param {string} props.title - Already-translated section title.
 * @param {string} props.icon - Tabler icon class (e.g. `"ti-star"`).
 * @param {string} [props.iconColor]
 * @param {number|null} [props.count] - Item count (shown in parens), or `null`.
 * @param {boolean} [props.muted] - Use tertiary text color (subtle).
 * @param {React.ReactNode} props.children
 * @param {string} [props.testId='section']
 * @returns {JSX.Element}
 */
export default function Section({
  title,
  icon,
  iconColor,
  count,
  muted,
  children,
  testId,
}) {
  return (
    <section data-testid={testId || 'section'} style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: muted ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <i className={`ti ${icon}`} style={{ color: iconColor || 'inherit' }} />
        {title}
        {count != null && (
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
            ({count})
          </span>
        )}
      </div>
      {children}
    </section>
  )
}