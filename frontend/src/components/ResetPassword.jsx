import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "../services/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    if (!params.get("token")) return setError("This password-reset link is invalid or incomplete.");
    setBusy(true);
    try {
      const result = await auth("reset-password", { token: params.get("token"), password });
      setNotice(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return <main className="reset-password-page"><form className="auth-modal" onSubmit={submit}><p className="eyebrow">HARUKA ACCOUNT</p><h2>Choose a new password.</h2><p className="auth-copy">Use at least 8 characters. This reset link can only be used once.</p><label>New password<input required minLength="8" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /></label><label>Confirm new password<input required minLength="8" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></label>{error && <p className="auth-error">{error}</p>}{notice && <p className="auth-notice">{notice}</p>}<button className="play-button auth-submit" disabled={busy || Boolean(notice)}>{busy ? "Please wait..." : "Reset password"}</button>{notice && <button type="button" className="auth-link-button" onClick={() => navigate("/")}>Return to Haruka</button>}</form></main>;
}
