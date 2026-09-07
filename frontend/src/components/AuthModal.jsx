import React, { useState } from "react";
import { auth } from "../services/api";

export default function AuthModal({ mode, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", rememberMe: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await auth(signup ? "signup" : "signin", form);
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
      <h2>{signup ? "Start your story." : "Welcome back."}</h2>
      <p className="auth-copy">{signup ? "Create your account to save the stories you love." : "Sign in to continue your next favorite story."}</p>
      {signup && <label>Name<input required minLength="2" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" /></label>}
      <label>Email<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
      <label>Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></label>
      {!signup && <label className="remember-me"><input type="checkbox" checked={form.rememberMe} onChange={(event) => setForm({ ...form, rememberMe: event.target.checked })} /> <span>Remember me for 30 days</span></label>}
      {error && <p className="auth-error">{error}</p>}
      <button className="play-button auth-submit" disabled={busy}>{busy ? "Please wait..." : signup ? "Create account" : "Sign in"}</button>
    </form>
  </div>;
}
