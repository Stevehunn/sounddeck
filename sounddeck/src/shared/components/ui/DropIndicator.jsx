export default function DropIndicator({ position, style = {} }) {
  if (!position) return null
  
  return (
    <div
      className="drop-indicator"
      style={{
        left: position.left || 0,
        right: position.right || 0,
        top: position.top || 0,
        bottom: position.bottom || 0,
        ...style
      }}
    />
  )
}