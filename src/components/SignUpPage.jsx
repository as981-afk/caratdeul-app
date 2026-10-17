import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import AvatarCircle from "./AvatarCircle";
import AvatarPickerModal from "./AvatarPickerModal";
import {
  MIN_PASSWORD_LENGTH,
  isEmailTaken,
  isUsernameTaken,
  isValidEmail,
  registerUser,
  saveCurrentUser,
} from "../utils/auth";
import "./LoginPage.css";

const PASSWORD_HINT = "Use at least 8 characters with a mix of letters, numbers and symbols.";

// Rough strength meter — demo-level feedback, not a security guarantee.
function scorePassword(pw) {
  if (!pw) return { level: 0, label: "" };
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = score >= 4 ? 3 : score >= 3 ? 2 : 1;
  return { level, label: level === 3 ? "Strong" : level === 2 ? "Fair" : "Weak" };
}

// Create Account screen — a dedicated layout, separate from Log In. Collects
// username, display name, email, password (+ confirmation) and an optional
// starting avatar from the same Carat icon picker used on the profile page.
export function SignUpPage({ onLogin, onBack, onRegistered }) {
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const strength = useMemo(() => scorePassword(form.password), [form.password]);

  const validateField = (name, value, all = form) => {
    switch (name) {
      case "username": {
        const v = value.trim();
        if (!v) return "Username is required.";
        if (v.length < 3) return "Username must be at least 3 characters.";
        if (isUsernameTaken(v)) return "That username is already taken.";
        return "";
      }
      case "email": {
        const v = value.trim();
        if (!v) return "Email is required.";
        if (!isValidEmail(v)) return "Enter a valid email address.";
        if (isEmailTaken(v)) return "That email is already registered.";
        return "";
      }
      case "password":
        if (!value) return "Password is required.";
        if (value.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your password.";
        if (value !== all.password) return "Passwords do not match.";
        return "";
      default:
        return "";
    }
  };

  const setField = (name, value) => {
    const next = { ...form, [name]: value };
    setForm(next);
    setErrors((cur) => {
      const draft = { ...cur };
      if (cur[name]) draft[name] = validateField(name, value, next);
      if (name === "password" && cur.confirmPassword) {
        draft.confirmPassword = validateField("confirmPassword", next.confirmPassword, next);
      }
      return draft;
    });
    setFormError("");
  };

  const handleBlur = (name) => {
    setErrors((cur) => ({ ...cur, [name]: validateField(name, form[name]) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fields = ["username", "email", "password", "confirmPassword"];
    const nextErrors = {};
    for (const f of fields) nextErrors[f] = validateField(f, form[f]);
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    const result = await registerUser({ ...form, avatarId: avatar });
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    try {
      saveCurrentUser(null);
    } catch {
      /* ignore */
    }
    if (typeof onRegistered === "function") {
      onRegistered({ email: form.email.trim().toLowerCase() });
      return;
    }
    if (typeof onLogin === "function") {
      onLogin(result.user);
    }
  };

  const fieldError = (name) =>
    errors[name] ? (
      <span className="login-field-error" role="alert">
        {errors[name]}
      </span>
    ) : null;

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-glow login-glow--rose"></div>
        <div className="login-glow login-glow--serenity"></div>
      </div>
      <div className="login-card login-card--signup">
        <div className="login-logo">CARATFLIX</div>
        <p className="login-subtitle">Create your account</p>
        <button className="login-back-btn" type="button" onClick={onBack}>
          ← Back to log in
        </button>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="signup-user">Username</label>
            <input
              id="signup-user"
              type="text"
              placeholder="Pick a username"
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
              onBlur={() => handleBlur("username")}
              autoComplete="username"
              aria-invalid={!!errors.username}
              autoFocus
            />
            {fieldError("username")}
          </div>

          <div className="login-field">
            <label htmlFor="signup-display">Display name <span className="signup-optional">Optional</span></label>
            <input
              id="signup-display"
              type="text"
              placeholder="Shown on your profile"
              value={form.displayName}
              onChange={(e) => setField("displayName", e.target.value)}
              autoComplete="nickname"
            />
          </div>

          <div className="login-field">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              autoComplete="email"
              aria-invalid={!!errors.email}
            />
            {fieldError("email")}
          </div>

          <div className="login-field">
            <label htmlFor="signup-pass">Password</label>
            <div className="login-password">
              <input
                id="signup-pass"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                autoComplete="new-password"
                aria-invalid={!!errors.password}
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
            {form.password && (
              <div className={`password-strength password-strength--${strength.level}`}>
                <span className="password-strength-bars" aria-hidden="true">
                  <span></span><span></span><span></span>
                </span>
                <span className="password-strength-label">{strength.label}</span>
              </div>
            )}
            <span className="login-field-hint">{PASSWORD_HINT}</span>
            {fieldError("password")}
          </div>

          <div className="login-field">
            <label htmlFor="signup-confirm">Confirm password</label>
            <div className="login-password">
              <input
                id="signup-confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
              />
            </div>
            {fieldError("confirmPassword")}
          </div>

          <div className="login-field signup-avatar-field">
            <label>Starting avatar <span className="signup-optional">Optional</span></label>
            <div className="signup-avatar-step">
              <AvatarCircle user={form.username || form.displayName || "?"} avatar={avatar} className="signup-avatar-preview" />
              <button type="button" className="signup-avatar-btn" onClick={() => setPickerOpen(true)}>
                {avatar ? "Change avatar" : "Choose an avatar"}
              </button>
            </div>
          </div>

          {formError && <div className="login-error" role="alert">{formError}</div>}
          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="login-switch">
          Already have an account?{" "}
          <button type="button" className="login-switch-btn" onClick={onBack}>
            Log in
          </button>
        </p>
      </div>

      {pickerOpen && (
        <AvatarPickerModal
          current={avatar}
          onSave={(id) => { setAvatar(id); return true; }}
          onClose={() => setPickerOpen(false)}
          subtitle="Pick a starting photo for your new profile."
        />
      )}
    </div>
  );
}

SignUpPage.propTypes = {
  onLogin: PropTypes.func,
  onBack: PropTypes.func,
  onRegistered: PropTypes.func,
};

export default SignUpPage;
