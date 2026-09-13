import React, { useState } from "react";
import { auth } from "../services/api";

export default function AuthModal({ mode, onClose, onSuccess, onModeChange }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", rememberMe: true });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const forgot = mode === "forgot";

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await auth(forgot ? "forgot-password" : signup ? "signup" : "signin", form);
      if (forgot) {
        setNotice(result.message);
        return;
      }
      if (result.pendingApproval) {
        setError(result.message);
        return;
      }
      onSuccess(result.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="modal-backdrop" onClick={onClose} role="presentation">
    <form className="auth-modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
      <button className="close" type="button" onClick={onClose} aria-label="Close">&times;</button>
      <p className="eyebrow">WELCOME TO HARUKA</p>
      <h2>{forgot ? "Reset your password." : signup ? "Start your story." : "Welcome back."}</h2>
      <p className="auth-copy">{forgot ? "Enter your email and we will send a one-time reset link." : signup ? "Create your account to save the stories you love." : "Sign in to continue your next favorite story."}</p>
      {signup && <label>Name<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" /></label>}
      <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
      {!forgot && <label>Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>}
      {!signup && !forgot && <div className="auth-options"><label className="remember-me"><input type="checkbox" checked={form.rememberMe} onChange={(event) => setForm({ ...form, rememberMe: event.target.checked })} /> <span>Remember me for 30 days</span></label><button type="button" className="forgot-password-link" onClick={() => onModeChange("forgot")}>Forgot password?</button></div>}
      {error && <p className="auth-error">{error}</p>}
      {notice && <p className="auth-notice">{notice}</p>}
      <button className="play-button auth-submit" disabled={busy}>{busy ? "Please wait..." : forgot ? "Send reset link" : signup ? "Create account" : "Sign in"}</button>
      {!signup && !forgot && <div className="auth-secondary"><button type="button" onClick={() => onModeChange("signup")}>Create account</button></div>}
      {signup && <div className="auth-secondary"><button type="button" onClick={() => onModeChange("signin")}>Sign in</button></div>}
      {forgot && <div className="auth-secondary"><button type="button" onClick={() => onModeChange("signin")}>Back to sign in</button></div>}
    </form>
  </div>;
}
