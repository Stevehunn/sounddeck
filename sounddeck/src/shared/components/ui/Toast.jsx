// src/shared/components/ui/Toast.jsx
export default function Toast({ toasts }) {
  if (!toasts.length) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <i className={`ti ${
            toast.type === 'success' ? 'ti-check' :
            toast.type === 'error' ? 'ti-x' :
            toast.type === 'warning' ? 'ti-alert-triangle' :
            'ti-info-circle'
          }`} />
          {toast.message}
        </div>
      ))}
    </div>
  )
}