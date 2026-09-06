import React, { useEffect, useState } from "react";
import { createExclusive, deleteExclusive, getExclusives, getUsers, updateUserRole } from "../services/api";

export default function AdminStudio({ onClose, onChanged }) {
  const [titles, setTitles] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ tmdbId: "", mediaType: "movie" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => Promise.all([getExclusives(), getUsers()]).then(([savedTitles, savedUsers]) => { setTitles(savedTitles); setUsers(savedUsers); }).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const add = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await createExclusive(form); setForm({ tmdbId: "", mediaType: "movie" }); load(); onChanged(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { await deleteExclusive(id); load(); onChanged(); } catch (err) { setError(err.message); } };
  const changeRole = async (id, role) => { try { await updateUserRole(id, role); load(); } catch (err) { setError(err.message); } };
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><section className="admin-studio" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">ADMIN STUDIO</p><h2>Only on Haruka</h2><p className="auth-copy">Add a TMDB title to Haruka’s exclusive collection. This is a catalog label, not a streaming license.</p>
    <form className="exclusive-form" onSubmit={add}><label>TMDB ID<input required min="1" type="number" value={form.tmdbId} onChange={(event) => setForm({ ...form, tmdbId: event.target.value })} placeholder="For example: 550" /></label><label>Type<select value={form.mediaType} onChange={(event) => setForm({ ...form, mediaType: event.target.value })}><option value="movie">Movie</option><option value="tv">Series</option></select></label><button className="play-button" disabled={busy}>{busy ? "Adding…" : "Add exclusive"}</button></form>
    {error && <p className="auth-error">{error}</p>}<div className="exclusive-list">{titles.map((title) => <div className="exclusive-item" key={title._id}><span>{title.title}<small>{title.mediaType === "tv" ? "Series" : "Movie"} · TMDB {title.tmdbId}</small></span><button onClick={() => remove(title._id)}>Remove</button></div>)}{!titles.length && !error && <p className="empty-rail">No exclusive titles yet.</p>}</div><section className="admin-users"><p className="eyebrow">TEAM ACCESS</p><h3>Haruka users</h3>{users.map((user) => <div className="admin-user" key={user.id}><span><strong>{user.name}</strong><small>{user.email}</small></span><select value={user.role} onChange={(event) => changeRole(user.id, event.target.value)}><option value="user">Member</option><option value="admin">Admin</option></select></div>)}</section>
  </section></div>;
}
