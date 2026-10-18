import { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import LoginPage from "./LoginPage";
import SignUpPage from "./SignUpPage";
import "./LoginPage.css";

// This app has no router, so the auth screens (Log In and Create Account) are
// separate components switched by local state. Log In is always the entry point
// — Create Account stays hidden until the user clicks "Create account".
//
// Choosing a profile happens *after* login (see ProfilePicker), so these screens
// deal only with the account credential step.
const HISTORY_KEY = "authView";

export function AuthFlow({ onLogin }) {
  const [view, setView] = useState("login");
  const [registered, setRegistered] = useState(null);
  const screenRef = useRef(null);

  // Lightweight history bookkeeping so the browser Back button returns from
  // Create Account to Log In. No URL changes are made.
  useEffect(() => {
    try { window.history.replaceState({ [HISTORY_KEY]: "login" }, ""); } catch { /* ignore */ }
    const onPop = (e) => {
      const next = e.state && e.state[HISTORY_KEY];
      setView(next === "signup" ? "signup" : "login");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next, state = null) => {
    if (next === view) return;
    try {
      if (next === "login") window.history.replaceState({ [HISTORY_KEY]: "login" }, "");
      else window.history.pushState({ [HISTORY_KEY]: next }, "");
    } catch { /* ignore */ }
    setView(next);
    setRegistered(next === "login" ? state : null);
  }, [view]);

  // Move focus into the newly shown screen for keyboard/screen-reader users.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const root = screenRef.current;
      if (!root) return;
      const target = root.querySelector("input") || root.querySelector("button");
      if (target) target.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [view]);

  const enter = useCallback((account) => {
    onLogin(account);
  }, [onLogin]);

  const screen = view === "signup" ? (
    <SignUpPage
      onBack={() => go("login")}
      onRegistered={({ email, needsConfirmation }) =>
        go("login", { registered: true, email, needsConfirmation })
      }
    />
  ) : (
    <LoginPage
      onLogin={enter}
      onCreateAccount={() => go("signup")}
      registered={registered?.registered}
      registeredEmail={registered?.email}
      registeredNeedsConfirmation={registered?.needsConfirmation}
    />
  );

  return (
    <div className="auth-screen" key={view} ref={screenRef}>
      {screen}
    </div>
  );
}

AuthFlow.propTypes = {
  onLogin: PropTypes.func,
};

export default AuthFlow;
