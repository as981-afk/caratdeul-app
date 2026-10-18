import { createContext, useCallback, useContext, useMemo, useState } from "react";
import ToastHost from "../components/ToastHost";

// App-wide toast queue. Any feature that wants a transient notification (badge
// unlocks, share confirmations, ...) calls `useToast().push(...)`.
//
// The provider owns the queue and the auto-dismiss timers; the presentation
// lives in <ToastHost> (rendered in a portal so a transformed/backdrop-filtered
// ancestor can't trap it).
const ToastContext = createContext(null);

const DEFAULT_DURATION = 3400;

// Safe fallback: a component rendered outside the provider still gets a no-op,
// so a toast is never the reason something fails to render.
const NOOP = { push: () => {}, dismiss: () => {} };

export function useToast() {
  return useContext(ToastContext) || NOOP;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    if (!toast) return;
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const entry = {
      id,
      emoji: toast.emoji || "✓",
      title: toast.title || "",
      message: toast.message || "",
      duration: toast.duration || DEFAULT_DURATION,
    };
    setToasts((current) => [...current.slice(-3), entry]);
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export default ToastContext;
