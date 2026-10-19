/**
 * @file Thin visual indicator shown between draggable items during a
 * drag-and-drop reorder operation.
 *
 * The component is purely presentational: it renders an absolutely
 * positioned accent-colored bar (via the `drop-indicator` class in
 * `index.css`, which provides the accent color and a `slideIn` animation).
 * The caller passes the `position` object (top / left / right / bottom),
 * so this component doesn't have to know the parent's layout.
 *
 * Returns `null` when `position` is falsy, so the caller can just render
 * `<DropIndicator position={dropPos} />` unconditionally and only
 * "activate" it by passing a non-null `position`.
 *
 * @see ../../features/home/Home.jsx — main consumer (sound grid)
 * @see index.css — `.drop-indicator` class
 */

/**
 * Drop indicator bar.
 *
 * @param {Object} props
 * @param {{ left?: number, right?: number, top?: number, bottom?: number } | null} props.position
 *   Absolute positioning values (all optional, default `0`). Falsy
 *   (null/undefined) renders nothing.
 * @param {React.CSSProperties} [props.style={}] - Style overrides merged
 *   after the position.
 * @returns {JSX.Element|null}
 */
export default function DropIndicator({ position, style = {} }) {
  if (!position) return null;

  return (
    <div
      className="drop-indicator"
      style={{
        left: position.left || 0,
        right: position.right || 0,
        top: position.top || 0,
        bottom: position.bottom || 0,
        ...style,
      }}
    />
  );
}