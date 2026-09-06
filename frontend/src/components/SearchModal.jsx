import React, { useEffect, useRef, useState } from "react";
import { searchTitles } from "../services/api";

export default function SearchModal({ onClose, onSelect }) {
  const [query, setQuery] = useState(""); const [type, setType] = useState("movie"); const [results, setResults] = useState([]); const [error, setError] = useState(""); const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setError(""); return undefined; }
    const timer = setTimeout(() => searchTitles(query, type).then(setResults).catch((err) => setError(err.message)), 350);
    return () => clearTimeout(timer);
  }, [query, type]);
  return <div className="modal-backdrop search-backdrop" onClick={onClose} role="presentation"><section className="search-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">FIND YOUR NEXT STORY</p><h2>Search Haruka</h2><div className="search-controls"><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles…" /><div className="search-type"><button className={type === "movie" ? "active" : ""} onClick={() => setType("movie")}>Movies</button><button className={type === "tv" ? "active" : ""} onClick={() => setType("tv")}>Series</button></div></div>
    {error && <p className="auth-error">{error}</p>}<div className="search-results">{results.map((item) => <button className="search-result" key={item.id} onClick={() => { onSelect(item); onClose(); }}><img src={item.poster || "https://placehold.co/500x750/17243d/e7edff?text=Haruka"} alt="" /><span><strong>{item.title}</strong><small>{item.year || "Coming soon"} · ★ {item.rating}</small><em>{item.overview || "Discover this title on Haruka."}</em></span></button>)}{query.length >= 2 && !results.length && !error && <p className="empty-rail">Searching the Haruka catalog…</p>}</div>
  </section></div>;
}
