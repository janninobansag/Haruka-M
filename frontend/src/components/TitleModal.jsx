import React, { useEffect, useState } from "react";
import { getTitleDetails } from "../services/api";

export default function TitleModal({ movie, onClose, onSave, onTrailer, signedIn }) {
  const [details, setDetails] = useState(null);
  useEffect(() => { if (!movie) { setDetails(null); return undefined; } let active = true; getTitleDetails(movie).then((data) => active && setDetails(data)).catch(() => active && setDetails(null)); return () => { active = false; }; }, [movie?.id, movie?.mediaType]);
  if (!movie) return null;
  const title = details || movie;
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><article className="title-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Close">×</button>
    <div className="modal-art" style={{ backgroundImage: `url(${movie.backdrop || movie.poster})` }} />
    <div className="modal-content"><p className="eyebrow">HARUKA SELECTS · {movie.mediaType === "tv" ? "SERIES" : "FILM"}</p><h2>{title.title}</h2><p className="meta">{title.year || "—"} <span>★ {title.rating}</span>{title.runtime && <span>{title.runtime} min</span>}</p><p>{title.overview || "A title waiting to be discovered on Haruka."}</p>{details && <div className="title-facts">{details.genres?.length > 0 && <p><b>Genres</b>{details.genres.join(" · ")}</p>}{details.lead && <p><b>{movie.mediaType === "tv" ? "Created by" : "Directed by"}</b>{details.lead}</p>}{details.cast?.length > 0 && <p><b>Cast</b>{details.cast.join(" · ")}</p>}</div>}<div className="hero-actions"><button className="play-button" onClick={() => onTrailer(movie)}>▶ Watch trailer</button>{signedIn && <button className="more-button" onClick={() => onSave(movie)}>＋ My List</button>}</div></div>
  </article></div>;
}
