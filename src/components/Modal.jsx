import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";
import "./Modal.css";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, in mount order. When several are stacked (e.g. the profile
// photo picker opened over the profile editor) only the top-most one reacts to
// Escape and traps Tab, so closing the picker never also closes the editor.
const modalStack = [];
let modalSeq = 0;

// Shared accessible modal dialog.
//
// - Announces itself as a dialog via role="dialog" / aria-modal / aria-label.
// - Traps Tab focus inside the dialog and moves focus to the dialog on open,
//   restoring it to the previously focused element on close.
// - Closes on Escape or on a backdrop click.
// - Locks body scroll while open.
export default function Modal({ label, onClose, className = "", overlayClassName = "", style, children }) {
  const panelRef = useRef(null);
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = ++modalSeq;

  // Register this dialog on the stack for as long as it is mounted.
  useLayoutEffect(() => {
    const id = idRef.current;
    modalStack.push(id);
    return () => {
      const idx = modalStack.lastIndexOf(id);
      if (idx !== -1) modalStack.splice(idx, 1);
    };
  }, []);

  // Focus the first focusable element on open; restore focus on close.
  useEffect(() => {
    const previous = document.activeElement;
    const panel = panelRef.current;
    const focusables = panel
      ? Array.from(panel.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      : [];
    const first = focusables[0];
    if (first) first.focus();
    else if (panel) panel.focus();
    return () => {
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, []);

  // Escape closes the dialog; Tab is trapped inside it. Only the top-most
  // dialog responds so an overlay never dismisses the dialog beneath it.
  useEffect(() => {
    const onKey = (e) => {
      if (modalStack[modalStack.length - 1] !== idRef.current) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current
        ? Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
            (n) => n.offsetParent !== null || n === document.activeElement
          )
        : [];
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  // Lock the page behind the dialog while it is open. The lock is ref-counted
  // (see bodyScrollLock) so stacked dialogs only unlock when the last one
  // closes; the cleanup also fires on unmount / route changes so the page can
  // never remain stuck unscrollable, and scrollbar-width padding keeps the
  // layout from shifting when the page scrollbar disappears.
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  return createPortal(
    <div className={`modal-overlay${overlayClassName ? ` ${overlayClassName}` : ""}`} onClick={onClose}>
      <div
        ref={panelRef}
        className={className}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label={`Close ${label}`}>
          ✕
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
