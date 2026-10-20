import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { approveUser, createExclusive, deleteExclusive, deleteUser, getExclusives, getUsers, searchTitles, updateExclusivePublication, updateUserRole, updateUserStatus } from "../services/api";

function AdminDisclosure({ id, eyebrow, title, summary, isOpen, onToggle, children }) {
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.height = `${panel.getBoundingClientRect().height}px`;
    panel.getBoundingClientRect();
    panel.style.height = isOpen ? `${panel.scrollHeight}px` : "0px";
  }, [isOpen]);

  const finishExpansion = (event) => {
    if (event.target === event.currentTarget && event.propertyName === "height" && isOpen) {
      panelRef.current.style.height = "auto";
    }
  };

  return <section className={`account-disclosure admin-disclosure${isOpen ? " is-open" : ""}`}>
    <button className="account-disclosure-trigger" type="button" aria-expanded={isOpen} aria-controls={id} onClick={onToggle}>
      <span><small className="eyebrow">{eyebrow}</small><strong>{title}</strong><small className="admin-disclosure-summary">{summary}</small></span>
      <span className="account-disclosure-icon" aria-hidden="true" />
    </button>
    <div id={id} ref={panelRef} className="account-disclosure-panel" aria-hidden={!isOpen} inert={isOpen ? undefined : ""} onTransitionEnd={finishExpansion}>
      <div className="account-disclosure-inner"><div className="account-disclosure-body">{children}</div></div>
    </div>
  </section>;
}

export default function AdminStudio({ currentUser, onClose, onChanged }) {
  const [titles, setTitles] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaType, setMediaType] = useState("movie");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (section) => setOpenSection((open) => open === section ? null : section);

  const load = () => Promise.all([getExclusives(), getUsers()])
    .then(([savedTitles, savedUsers]) => { setTitles(savedTitles); setUsers(savedUsers); setLoaded(true); })
    .catch((err) => setError(err.message));

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchLoading(false);
      setSearchResults([]);
      setSearchError("");
      return undefined;
    }

    let active = true;
    setSearchLoading(true);
    setSearchError("");
    const timer = window.setTimeout(() => {
      searchTitles(query, mediaType)
        .then((results) => { if (active) setSearchResults(results); })
        .catch((err) => { if (active) setSearchError(err.message); })
        .finally(() => { if (active) setSearchLoading(false); });
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, mediaType]);

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const add = async (event) => {
    event.preventDefault();
    if (!selectedTitle) return;
    setBusy(true);
    setError("");
    try {
      await createExclusive({ tmdbId: selectedTitle.id, mediaType: selectedTitle.mediaType || mediaType });
      setSearchQuery("");
      setSearchResults([]);
      setSelectedTitle(null);
      load();
      onChanged();
    }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const updateSearchQuery = (query) => {
    setSearchQuery(query);
    setSearchResults([]);
    setSelectedTitle(null);
    setSearchError("");
    setError("");
    setSearchLoading(query.trim().length >= 2);
  };

  const updateMediaType = (type) => {
    setMediaType(type);
    setSearchResults([]);
    setSelectedTitle(null);
    setSearchError("");
    setError("");
    setSearchLoading(searchQuery.trim().length >= 2);
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
      <button className="close" type="button" onClick={onClose} aria-label="Close">&times;</button>
      <header className="admin-studio-header">
        <p className="eyebrow">HARUKA MANAGEMENT</p>
        <h2>Admin Studio</h2>
        <p className="auth-copy">Manage exclusive titles and member access.</p>
      </header>
      <div className="admin-studio-content">
        {error && <p className="auth-error" role="alert">{error}</p>}
        <AdminDisclosure id="admin-add-panel" eyebrow="CATALOG" title="Add exclusive" summary="Add a TMDB movie or series" isOpen={openSection === "add"} onToggle={() => toggleSection("add")}>
          <p className="admin-section-help">Search TMDB by name, choose the right match, and add it to Haruka&apos;s exclusive collection. This is a catalog label, not a streaming license.</p>
          <form className="exclusive-form" onSubmit={add}>
            <label>Title<input required type="search" value={searchQuery} onChange={(event) => updateSearchQuery(event.target.value)} placeholder="Search by title" autoComplete="off" /></label>
            <label>Type<select value={mediaType} onChange={(event) => updateMediaType(event.target.value)}><option value="movie">Movie</option><option value="tv">Series</option></select></label>
            {searchQuery.trim().length >= 2 && !selectedTitle && <div className="exclusive-search-state" aria-live="polite">
              {searchLoading && <p role="status">Searching TMDB…</p>}
              {searchError && <p className="auth-error" role="alert">{searchError}</p>}
              {!searchLoading && !searchError && searchResults.length === 0 && <p>No matching titles found.</p>}
            </div>}
            {searchResults.length > 0 && !selectedTitle && <div className="exclusive-search-results" role="listbox" aria-label="TMDB search results">
              {searchResults.slice(0, 5).map((item) => <button className="exclusive-search-result" type="button" role="option" aria-selected="false" key={item.id} onClick={() => { setSelectedTitle(item); setError(""); }}>
                {item.poster ? <img src={item.poster} alt="" /> : <span className="exclusive-search-poster-placeholder" aria-hidden="true">No poster</span>}
                <span className="exclusive-search-result-copy"><strong>{item.title}</strong><small>{item.year || "Release year unavailable"} · {item.mediaType === "tv" ? "Series" : "Movie"}</small></span>
                <span className="exclusive-search-result-action" aria-hidden="true">Select</span>
              </button>)}
            </div>}
            {searchResults.length > 5 && !selectedTitle && <p className="exclusive-search-more">Showing the first 5 matches. Add more words to narrow your search.</p>}
            {selectedTitle && <div className="exclusive-selected-title" aria-live="polite">
              {selectedTitle.poster ? <img src={selectedTitle.poster} alt="" /> : <span className="exclusive-search-poster-placeholder" aria-hidden="true">No poster</span>}
              <span className="exclusive-search-result-copy"><strong>{selectedTitle.title}</strong><small>{selectedTitle.year || "Release year unavailable"} · {selectedTitle.mediaType === "tv" ? "Series" : "Movie"}</small></span>
              <button type="button" className="exclusive-selection-clear" onClick={() => setSelectedTitle(null)}>Change</button>
            </div>}
            <button className="play-button" disabled={busy || !selectedTitle}>{busy ? "Adding..." : "Add exclusive"}</button>
          </form>
        </AdminDisclosure>
        <AdminDisclosure id="admin-titles-panel" eyebrow="ONLY ON HARUKA" title="Manage titles" summary={loaded ? `${titles.length} ${titles.length === 1 ? "title" : "titles"} in the collection` : "Loading collection"} isOpen={openSection === "titles"} onToggle={() => toggleSection("titles")}>
          <div className="exclusive-list">
            {titles.map((title) => <div className="exclusive-item" key={title._id}>
              <span>{title.title}<small>{title.mediaType === "tv" ? "Series" : "Movie"} · TMDB {title.tmdbId} · {title.isPublished !== false ? "Published" : "Unpublished"}</small></span>
              <div className="exclusive-actions"><button type="button" onClick={() => changePublication(title._id, title.isPublished === false)}>{title.isPublished !== false ? "Unpublish" : "Publish"}</button><button type="button" onClick={() => remove(title._id)}>Remove</button></div>
            </div>)}
            {loaded && !titles.length && !error && <p className="empty-rail">No exclusive titles yet.</p>}
          </div>
        </AdminDisclosure>
        <AdminDisclosure id="admin-users-panel" eyebrow="TEAM ACCESS" title="Haruka users" summary={loaded ? `${users.length} ${users.length === 1 ? "account" : "accounts"}` : "Loading accounts"} isOpen={openSection === "users"} onToggle={() => toggleSection("users")}>
          <div className="admin-users">
            {users.map((account) => <div className={`admin-user ${account.isOnline ? "is-online" : "is-offline"}`} key={account.id}>
              <span><strong>{account.name}</strong><small>{account.email} · {account.role === "superadmin" ? "Super Admin" : account.role === "admin" ? "Admin" : "Member"} · {userStatus(account)}</small></span>
              {canManageUser(account) && <div className="user-actions">
                {account.role === "user" && account.approvalStatus === "pending" && <button className="status-user" type="button" onClick={() => approveAccount(account)}>Approve</button>}
                {currentUser.role === "superadmin" && <select value={account.role} aria-label={`Role for ${account.name}`} onChange={(event) => changeRole(account.id, event.target.value)}><option value="user">Member</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select>}
                <button className="status-user" type="button" onClick={() => changeStatus(account)}>{account.isActive ? "Deactivate" : "Reactivate"}</button>
                <button className="delete-user" type="button" onClick={() => permanentlyDelete(account)}>Delete</button>
              </div>}
            </div>)}
            {loaded && !users.length && !error && <p className="empty-rail">No users found.</p>}
          </div>
        </AdminDisclosure>
      </div>
    </section>
  </div>;
}
