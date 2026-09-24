// src/features/options/Toggle.jsx
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