import React from "react";

export default function MovieRail({ title, label, movies, loading, error, onSelect, onExploreAll }) {
  return <section className="rail">
    <div className="rail-heading"><div><p className="eyebrow">{label}</p><h2>{title}</h2></div>{onExploreAll && <button className="see-all" onClick={onExploreAll}>Explore all <span>→</span></button>}</div>
    {error ? <p className="rail-message">{error}</p> : !loading && movies.length === 0 ? <p className="empty-rail">Haruka exclusives will appear here when they are ready for their premiere.</p> : <div className="movie-row">
      {loading ? Array.from({ length: 6 }).map((_, index) => <div className="movie-skeleton" key={index} />) : movies.map((movie) =>
        <button className="movie-card" key={movie.id} onClick={() => onSelect(movie)} aria-label={`View ${movie.title}`}>
          <img src={movie.poster || "https://placehold.co/500x750/17243d/e7edff?text=Haruka"} alt="" />
          <span className="card-shade" /><span className="card-info"><strong>{movie.title}</strong><small>{movie.year || "Coming soon"} · ★ {movie.rating}</small></span>
        </button>)}
    </div>}
  </section>;
}
