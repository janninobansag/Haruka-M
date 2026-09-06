import React, { useEffect, useState } from "react";
import { deleteWatchlistItem, getWatchlist } from "../services/api";

export default function MyListModal({ onClose, onSelect }) {
  const [items, setItems] = useState([]); const [error, setError] = useState("");
  const load = () => getWatchlist().then(setItems).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const remove = async (item) => { try { await deleteWatchlistItem(item.tmdbId, item.mediaType); load(); } catch (err) { setError(err.message); } };
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><section className="my-list-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">YOUR LIBRARY</p><h2>My List</h2>{error && <p className="auth-error">{error}</p>}<div className="my-list-grid">{items.map((item) => <article key={item._id}><button className="saved-card" onClick={() => { onSelect({ ...item, id: item.tmdbId }); onClose(); }}><img src={item.poster || "https://placehold.co/500x750/17243d/e7edff?text=Haruka"} alt="" /><strong>{item.title}</strong></button><button className="remove-saved" onClick={() => remove(item)}>Remove</button></article>)}{!items.length && !error && <p className="empty-rail">Your saved titles will appear here.</p>}</div>
  </section></div>;
}
