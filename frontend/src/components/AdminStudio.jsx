import React, { useEffect, useState } from "react";
import { approveUser, createExclusive, deleteExclusive, deleteUser, getExclusives, getUsers, updateExclusivePublication, updateUserRole, updateUserStatus } from "../services/api";

export default function AdminStudio({ currentUser, onClose, onChanged }) {
  const [titles, setTitles] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ tmdbId: "", mediaType: "movie" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([getExclusives(), getUsers()])
    .then(([savedTitles, savedUsers]) => { setTitles(savedTitles); setUsers(savedUsers); })
    .catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const add = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await createExclusive(form); setForm({ tmdbId: "", mediaType: "movie" }); load(); onChanged(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await deleteExclusive(id); load(); onChanged(); }
    catch (err) { setError(err.message); }
  };

  const changePublication = async (id, isPublished) => {
    try { await updateExclusivePublication(id, isPublished); load(); onChanged(); }
    catch (err) { setError(err.message); }
  };

  const changeRole = async (id, role) => {
    try { await updateUserRole(id, role); load(); }
    catch (err) { setError(err.message); }
  };

  const changeStatus = async (user) => {
    const nextStatus = !user.isActive;
    if (!window.confirm(`${nextStatus ? "Reactivate" : "Deactivate"} ${user.name}'s account?`)) return;
    try { await updateUserStatus(user.id, nextStatus); load(); }
    catch (err) { setError(err.message); }
  };

  const approveAccount = async (user) => {
    if (!window.confirm(`Approve ${user.name}'s account?`)) return;
    try { await approveUser(user.id); load(); }
    catch (err) { setError(err.message); }
  };

  const permanentlyDelete = async (user) => {
    const confirmed = window.confirm(`Permanently delete ${user.name}'s account? This also deletes their My List and Recently Explored history. This cannot be undone.`);
    if (!confirmed) return;
    try { await deleteUser(user.id); load(); }
    catch (err) { setError(err.message); }
  };

  const canManageUser = (account) => {
    if (account.id === currentUser.id || account.role === "superadmin") return false;
    return currentUser.role === "superadmin" || account.role === "user";
  };

  const userStatus = (account) => !account.isActive
    ? "Deactivated"
    : account.approvalStatus === "pending"
      ? "Awaiting approval"
      : "Active";

  return <div className="modal-backdrop" onClick={onClose} role="presentation">
    <section className="admin-studio" onClick={(event) => event.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label="Close">&times;</button>
      <p className="eyebrow">ADMIN STUDIO</p>
      <h2>Only on Haruka</h2>
      <p className="auth-copy">Add a TMDB title to Haruka&apos;s exclusive collection. This is a catalog label, not a streaming license.</p>
      <form className="exclusive-form" onSubmit={add}>
        <label>TMDB ID<input required min="1" type="number" value={form.tmdbId} onChange={(event) => setForm({ ...form, tmdbId: event.target.value })} placeholder="For example: 550" /></label>
        <label>Type<select value={form.mediaType} onChange={(event) => setForm({ ...form, mediaType: event.target.value })}><option value="movie">Movie</option><option value="tv">Series</option></select></label>
        <button className="play-button" disabled={busy}>{busy ? "Adding..." : "Add exclusive"}</button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <div className="exclusive-list">
        {titles.map((title) => <div className="exclusive-item" key={title._id}>
          <span>{title.title}<small>{title.mediaType === "tv" ? "Series" : "Movie"} · TMDB {title.tmdbId} · {title.isPublished !== false ? "Published" : "Unpublished"}</small></span>
          <div className="exclusive-actions"><button onClick={() => changePublication(title._id, title.isPublished === false)}>{title.isPublished !== false ? "Unpublish" : "Publish"}</button><button onClick={() => remove(title._id)}>Remove</button></div>
        </div>)}
        {!titles.length && !error && <p className="empty-rail">No exclusive titles yet.</p>}
      </div>
      <section className="admin-users"><p className="eyebrow">TEAM ACCESS</p><h3>Haruka users</h3>
        {users.map((account) => <div className="admin-user" key={account.id}>
          <span><strong>{account.name}</strong><small>{account.email} · {account.role === "superadmin" ? "Super Admin" : account.role === "admin" ? "Admin" : "Member"} · {userStatus(account)}</small></span>
          {canManageUser(account) && <div className="user-actions">
            {account.role === "user" && account.approvalStatus === "pending" && <button className="status-user" onClick={() => approveAccount(account)}>Approve</button>}
            {currentUser.role === "superadmin" && <select value={account.role} onChange={(event) => changeRole(account.id, event.target.value)}><option value="user">Member</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select>}
            <button className="status-user" onClick={() => changeStatus(account)}>{account.isActive ? "Deactivate" : "Reactivate"}</button>
            <button className="delete-user" onClick={() => permanentlyDelete(account)}>Delete</button>
          </div>}
        </div>)}
      </section>
    </section>
  </div>;
}
