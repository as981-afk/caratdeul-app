import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./ToastHost.css";

// One toast. Auto-dismisses after its own duration; the provider removes it.
function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div className="app-toast" role="status" aria-live="polite">
      <span className="app-toast-emoji" aria-hidden="true">{toast.emoji}</span>
      <span className="app-toast-text">
        {toast.title && <span className="app-toast-title">{toast.title}</span>}
        {toast.message && <span className="app-toast-message">{toast.message}</span>}
      </span>
      <button
        type="button"
        className="app-toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

// Bottom-centre stack, rendered in a portal so it floats above modals and the
// navbar's backdrop-filter.
export default function ToastHost({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return createPortal(
    <div className="app-toast-stack">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
}
