import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { DEMO_PASSWORD, DEMO_USER, loginUser, saveCurrentUser } from "../utils/auth";
import "./LoginPage.css";

// Log In screen. Accepts a username OR email. Signing up lives entirely in
// SignUpPage — this form never doubles as a registration form.
export function LoginPage({
  onLogin,
  onCreateAccount,
  registered = false,
  registeredEmail = "",
}) {
  const [identifier, setIdentifier] = useState(() => (registered && registeredEmail ? registeredEmail : ""));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (registered && registeredEmail && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [registered, registeredEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!identifier.trim() || !password) {
      setError("Please enter your username/email and password.");
      return;
    }
    setSubmitting(true);
    const result = await loginUser(identifier.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    saveCurrentUser(result.user);
    onLogin(result.user);
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-glow login-glow--rose"></div>
        <div className="login-glow login-glow--serenity"></div>
      </div>
      <div className="login-card">
        <div className="login-logo">CARATFLIX</div>
        <p className="login-subtitle">Welcome back, Carat</p>
        {registered && (
          <div className="login-notice" role="status">
            Account created! Please log in.
          </div>
        )}
        {notice && <div className="login-notice">{notice}</div>}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="login-user">Username or email</label>
            <input
              id="login-user"
              type="text"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
              autoComplete="username"
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-pass">Password</label>
            <div className="login-password">
              <input
                id="login-pass"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoComplete="current-password"
                ref={passwordRef}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="login-forgot"
            onClick={() => setNotice("Password reset isn't available in this demo yet.")}
          >
            Forgot password?
          </button>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "Logging in..." : "Log In"}
          </button>
        </form>
        <p className="login-switch">
          New here?{" "}
          <button type="button" className="login-switch-btn" onClick={onCreateAccount}>
            Create account
          </button>
        </p>
        <p className="login-hint">
          Demo mode: accounts are saved only in this browser. Log in with{" "}
          <strong>{DEMO_USER} / {DEMO_PASSWORD}</strong>.
        </p>
      </div>
    </div>
  );
}

LoginPage.propTypes = {
  onLogin: PropTypes.func,
  onCreateAccount: PropTypes.func,
  registered: PropTypes.bool,
  registeredEmail: PropTypes.string,
};

export default LoginPage;
