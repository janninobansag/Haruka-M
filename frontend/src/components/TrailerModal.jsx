import React, { useEffect, useState } from "react";
import { getTrailer } from "../services/api";

export default function TrailerModal({ title, onClose }) {
  const [trailer, setTrailer] = useState(null); const [error, setError] = useState("");
  useEffect(() => { let active = true; getTrailer(title).then((data) => active && setTrailer(data)).catch((err) => active && setError(err.message)); return () => { active = false; }; }, [title]);
  return <div className="modal-backdrop" onClick={onClose} role="presentation"><section className="trailer-modal" onClick={(event) => event.stopPropagation()}>
    <button className="close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">OFFICIAL TRAILER</p><h2>{title.title}</h2>{error ? <p className="auth-error">{error}</p> : !trailer ? <p className="empty-rail">Loading trailer…</p> : <div className="trailer-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&rel=0`} title={trailer.name} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>}
  </section></div>;
}
