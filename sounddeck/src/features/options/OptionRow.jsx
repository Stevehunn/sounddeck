// src/features/options/OptionRow.jsx
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