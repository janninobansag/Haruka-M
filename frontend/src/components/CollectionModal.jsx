import React, { useState } from "react";
import { getCollection } from "../services/api";

export default function CollectionModal({ collection, initialMovies, label, title, type, onClose, onSelect }) {
  const [movies, setMovies] = useState(initialMovies);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(collection !== "haruka-only");

  const loadMore = async () => {
    setLoading(true); setError("");
    try {
      const nextPage = page + 1;
      const nextMovies = await getCollection(collection, type, nextPage);
      const unseen = nextMovies.filter((item) => !movies.some((movie) => movie.id === item.id));
      setMovies((current) => [...current, ...unseen]);
      setPage(nextPage);
      setHasMore(nextMovies.length === 20 && unseen.length > 0);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return <div className="modal-backdrop" onClick={onClose} role="presentation"><section className="collection-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Close">&times;</button><p className="eyebrow">{label}</p><h2>{title}</h2><p className="auth-copy">Browse every available {type === "tv" ? "series" : "movie"} in this collection.</p>
    <div className="collection-grid">{movies.map((movie) => <button className="movie-card" key={movie.id} onClick={() => { onSelect(movie); onClose(); }} aria-label={`View ${movie.title}`}><img src={movie.poster || "https://placehold.co/500x750/17243d/e7edff?text=Haruka"} alt="" /><span className="card-shade" /><span className="card-info"><strong>{movie.title}</strong><small>{movie.year || "Coming soon"} · ★ {movie.rating}</small></span></button>)}</div>
    {error && <p className="auth-error">{error}</p>}{hasMore && <button className="play-button load-more" disabled={loading} onClick={loadMore}>{loading ? "Loading..." : "Load more"}</button>}
  </section></div>;
}
