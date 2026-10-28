/**
 * @file Always-visible section wrapper (Options page).
 *
 * Renders a colored title bar with an icon and its children stacked
 * vertically. `forwardRef` because `useSectionObserver` needs a DOM ref
 * to attach the `IntersectionObserver`.
 *
 * @see ./Options.jsx
 * @see ./hooks/useSectionObserver.js
 */

import { forwardRef } from 'react'

/**
 * Options section wrapper.
 *
 * @type {React.ForwardRefExoticComponent<{
 *   title: string,
 *   icon: string,
 *   children?: React.ReactNode,
 *   id?: string,
 * } & React.RefAttributes<HTMLDivElement>>}
 */
const Section = forwardRef(({ title, icon, children, id }, ref) => {
  return (
    <div
      ref={ref}
      data-section={id}
      data-testid={`section-${id}`}
      style={{ marginBottom: 32, scrollMarginTop: 80 }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent)',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <i className={`ti ${icon}`} />
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
})

Section.displayName = 'Section'

export default Section