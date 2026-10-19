/**
 * @file Toast notifications container.
 *
 * Renders the stack of toasts currently in the app's toast queue. Each
 * toast has a `type` (success / error / warning / info) that drives its
 * icon, and a `message` string.
 *
 * **Defensive**: `message` is coerced to a string via `String()`. This
 * prevents the whole app from crashing with "Objects are not valid as a
 * React child" if a caller accidentally passes an object or array to
 * `addToast()` — the raw `[object Object]` is at least visible and
 * debuggable instead of taking down the React tree.
 *
 * @param {Object} props
 * @param {Array<{ id: string, message: unknown, type: 'success'|'error'|'warning'|'info' }>} props.toasts
 * @returns {JSX.Element|null}
 */
export default function Toast({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <i
            className={`ti ${
              toast.type === "success"
                ? "ti-check"
                : toast.type === "error"
                  ? "ti-x"
                  : toast.type === "warning"
                    ? "ti-alert-triangle"
                    : "ti-info-circle"
            }`}
          />
          {String(toast.message ?? "")}
        </div>
      ))}
    </div>
  );
}