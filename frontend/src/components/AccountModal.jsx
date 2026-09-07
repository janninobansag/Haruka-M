import React, { useState } from "react";
import { changePassword, updateProfile } from "../services/api";

export default function AccountModal({ user, onClose, onUpdate, onSignOut }) {
  const [name, setName] = useState(user.name);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const updated = await updateProfile({ name }); onUpdate(updated); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const savePassword = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await changePassword(passwords); setPasswords({ currentPassword: "", newPassword: "" }); setNotice("Password updated successfully."); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><section className="account-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" type="button" onClick={onClose} aria-label="Close">&times;</button><p className="eyebrow">YOUR HARUKA ACCOUNT</p><h2>Account</h2><div className="account-email">{user.email}</div><div className="role-badge">{user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Member"}</div>
    <form onSubmit={save}><label>Display name<input required minLength="2" maxLength="60" value={name} onChange={(event) => setName(event.target.value)} /></label><button className="play-button auth-submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button></form>
    <section className="password-section"><p className="eyebrow">SECURITY</p><h3>Change password</h3><form onSubmit={savePassword}><label>Current password<input required type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label>New password<input required minLength="8" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label><button className="more-button" disabled={busy}>{busy ? "Saving..." : "Update password"}</button></form></section>{error && <p className="auth-error">{error}</p>}{notice && <p className="account-notice">{notice}</p>}<button type="button" className="signout-button" onClick={onSignOut}>Sign out of Haruka</button>
  </section></div>;
}
