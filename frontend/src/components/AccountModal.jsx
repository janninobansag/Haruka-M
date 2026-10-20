import React, { useState } from "react";
import { changePassword, deleteMyAccount, updateProfile } from "../services/api";

function AccountDisclosure({ id, eyebrow, title, className = "", isOpen, onToggle, children }) {
  return <section className={`account-disclosure ${className}${isOpen ? " is-open" : ""}`}>
    <button
      className="account-disclosure-trigger"
      type="button"
      aria-expanded={isOpen}
      aria-controls={id}
      onClick={onToggle}
    >
      <span><small className="eyebrow">{eyebrow}</small><strong>{title}</strong></span>
      <span className="account-disclosure-icon" aria-hidden="true" />
    </button>
    <div id={id} className="account-disclosure-panel" aria-hidden={!isOpen} inert={isOpen ? undefined : ""}>
      <div className="account-disclosure-inner"><div className="account-disclosure-body">{children}</div></div>
    </div>
  </section>;
}

export default function AccountModal({ user, onClose, onUpdate, onSignOut, onDelete }) {
  const [name, setName] = useState(user.name);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (section) => setOpenSection((open) => open === section ? null : section);
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
  const removeAccount = async () => {
    const confirmed = window.confirm("Permanently delete your Haruka account? Your My List and Recently Explored history will also be deleted. This cannot be undone.");
    if (!confirmed) return;
    setBusy(true); setError("");
    try { await deleteMyAccount(); onDelete(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="modal-backdrop" onClick={onClose} role="presentation">
    <section className="account-modal" onClick={(event) => event.stopPropagation()}>
      <button className="close" type="button" onClick={onClose} aria-label="Close">&times;</button>
      <header className="account-modal-header">
        <p className="eyebrow">YOUR HARUKA ACCOUNT</p>
        <h2>Account</h2>
        <div className="account-email">{user.email}</div>
        <div className="role-badge">{user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Member"}</div>
      </header>
      <div className="account-modal-content">

        <AccountDisclosure id="account-profile-panel" eyebrow="PROFILE" title="Edit profile" isOpen={openSection === "profile"} onToggle={() => toggleSection("profile")}>
          <form onSubmit={save}>
            <label>Display name<input required minLength="2" maxLength="60" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <button className="play-button auth-submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
          </form>
        </AccountDisclosure>

        <AccountDisclosure id="account-password-panel" eyebrow="SECURITY" title="Change password" className="password-section" isOpen={openSection === "password"} onToggle={() => toggleSection("password")}>
          <form onSubmit={savePassword}>
            <label>Current password<input required type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label>
            <label>New password<input required minLength="8" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label>
            <button className="more-button" disabled={busy}>{busy ? "Saving..." : "Update password"}</button>
          </form>
        </AccountDisclosure>

        <AccountDisclosure id="account-delete-panel" eyebrow="ACCOUNT DATA" title="Delete account" className="delete-account-section" isOpen={openSection === "delete"} onToggle={() => toggleSection("delete")}>
          <p>This permanently removes your account, My List, and Recently Explored history.</p>
          <button type="button" className="delete-account-button" onClick={removeAccount} disabled={busy}>{busy ? "Deleting..." : "Delete account permanently"}</button>
        </AccountDisclosure>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="account-notice" role="status">{notice}</p>}
      </div>
      <footer className="account-modal-footer">
        <button type="button" className="more-button account-signout-button" onClick={onSignOut}>Sign out</button>
      </footer>
    </section>
  </div>;
}
