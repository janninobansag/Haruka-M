import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import MovieRail from "./components/MovieRail";
import TitleModal from "./components/TitleModal";
import AuthModal from "./components/AuthModal";
import AdminStudio from "./components/AdminStudio";
import MyListModal from "./components/MyListModal";
import SearchModal from "./components/SearchModal";
import TrailerModal from "./components/TrailerModal";
import AccountModal from "./components/AccountModal";
import CollectionModal from "./components/CollectionModal";
import VideoPlayer from "./components/VideoPlayer";
import { addWatchlistItem, auth, getCollection, getRecentlyViewed, getSession, saveRecentlyViewed } from "./services/api";
import "./styles/app.css";

const rails = [
  ["trending", "Trending Today", "PULSE CHECK"],
  ["haruka-only", "Only on Haruka", "EXCLUSIVELY HERE"],
  ["top-rated", "Top Rated", "CROWD FAVORITES"],
  ["comedy", "Comedy", "LIGHTER SIDE"],
  ["horror", "Horror", "AFTER DARK"]
];

function HomePage() {
  const [type, setType] = useState("movie");
  const [catalog, setCatalog] = useState({});
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trailerTitle, setTrailerTitle] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [recentTitles, setRecentTitles] = useState([]);
  const [collectionView, setCollectionView] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getSession().then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => { if (!user) { setRecentTitles([]); return undefined; } getRecentlyViewed().then(setRecentTitles).catch(() => setRecentTitles([])); return undefined; }, [user]);

  useEffect(() => {
    let active = true;
    setCatalog({}); setError("");
    Promise.all(rails.map(([key]) => getCollection(key, type).then((items) => [key, items])))
      .then((entries) => active && setCatalog(Object.fromEntries(entries)))
      .catch((requestError) => active && setError(requestError.message));
    return () => { active = false; };
  }, [type, catalogVersion]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const feature = catalog.trending?.[0];
  const signOut = async () => { await auth("signout", {}); setUser(null); setAccountOpen(false); };
  const saveTitle = async (title) => { try { await addWatchlistItem(title); window.alert(`${title.title} was added to My List.`); } catch (error) { window.alert(error.message); } };
  const openTitle = (title) => { 
    setSelected(title); 
    if (user && title?.id) { 
      saveRecentlyViewed(title).then(() => getRecentlyViewed().then(setRecentTitles)).catch(() => {}); 
    } 
  };

  const canWatch = Boolean(user && (user.role !== "user" || user.approvalStatus === "approved"));
  const handleWatchNow = (movie) => {
    if (!canWatch) { setSelected(null); setAuthMode("signin"); return; }
    setSelected(null);
    if (movie.mediaType === "tv") {
      navigate(`/tv/watch/${movie.id}/1/1`);
    } else {
      navigate(`/movie/watch/${movie.id}`);
    }
  };

  const installApp = async () => {
    if (!installPrompt) {
      window.alert("To install Haruka, use your browser menu and choose 'Add to Home screen' or 'Install app'.");
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return <main>
    <header className="nav"><a className="brand" href="#top" aria-label="Haruka home"><img src="/haruka-logo.png" alt="Haruka Cinema" /></a><nav><button className="install-button" onClick={installApp}>Install app</button><a href="#browse">Discover</a><button className="nav-list" onClick={() => user ? setListOpen(true) : setAuthMode("signin")}>My List</button></nav><div className="nav-actions"><button className="search" onClick={() => setSearchOpen(true)} aria-label="Search">⌕</button>{user ? <>{["admin", "superadmin"].includes(user.role) && <button className="admin-link" onClick={() => setAdminOpen(true)}>Admin Studio</button>}<button className="account-trigger" onClick={() => setAccountOpen(true)} title="Open account"><span>Hi, {user.name.split(" ")[0]}</span><span className="account-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.7-3.5 3-5.3 6.5-5.3s5.8 1.8 6.5 5.3" /></svg></span></button></> : <button className="sign-in" onClick={() => setAuthMode("signin")}>Sign in</button>}</div></header>
    <section className="hero" id="top" style={feature?.backdrop ? { backgroundImage: `url(${feature.backdrop})` } : {}}><video className="hero-video" autoPlay muted loop playsInline poster={feature?.backdrop || undefined}><source src="/hero.mp4" type="video/mp4" /></video><div className="hero-overlay" /><div className="hero-content"><p className="eyebrow">A NEW KIND OF NIGHT IN</p><h1>{feature?.title || "Stories worth staying up for."}</h1><p>{feature?.overview || "Haruka brings your favorite worlds together in one calm, cinematic space."}</p><div className="hero-actions"><button className="play-button" onClick={() => openTitle(feature)}>▶ Explore title</button><button className="more-button" onClick={() => user ? setListOpen(true) : setAuthMode("signup")}>＋ {user ? "My List" : "Join Haruka"}</button></div></div><div className="hero-orbit"><i /><i /><i /></div></section>
    <section className="switcher-wrap" id="browse"><div className="content-switcher"><span>Show me</span><button className={type === "movie" ? "active" : ""} onClick={() => setType("movie")}>Movies</button><button className={type === "tv" ? "active" : ""} onClick={() => setType("tv")}>Series</button></div></section>
    <div className="catalog" id="collections">{user && recentTitles.length > 0 && <MovieRail title="Recently Explored" label="PICK UP WHERE YOU LEFT OFF" movies={recentTitles.map((title) => ({ ...title, id: title.tmdbId }))} loading={false} error="" onSelect={openTitle} />}{rails.map(([key, title, label]) => <MovieRail key={key} title={title} label={label} movies={catalog[key] || []} loading={!error && !catalog[key]} error={error} onSelect={openTitle} onExploreAll={() => setCollectionView({ key, title, label, movies: catalog[key] || [] })} />)}</div>
    <footer>HARUKA <span>— made for your next favorite story.</span></footer>
    <TitleModal movie={selected} onClose={() => setSelected(null)} onSave={saveTitle} onTrailer={setTrailerTitle} onWatchNow={handleWatchNow} signedIn={Boolean(user)} canWatch={canWatch} />
    {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSuccess={(newUser) => { setUser(newUser); setAuthMode(null); }} />}
    {adminOpen && <AdminStudio currentUser={user} onClose={() => setAdminOpen(false)} onChanged={() => setCatalogVersion((version) => version + 1)} />}
    {listOpen && <MyListModal onClose={() => setListOpen(false)} onSelect={openTitle} />}
    {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} onSelect={openTitle} />}
    {collectionView && <CollectionModal collection={collectionView.key} initialMovies={collectionView.movies} label={collectionView.label} title={collectionView.title} type={type} onClose={() => setCollectionView(null)} onSelect={openTitle} />}
    {trailerTitle && <TrailerModal title={trailerTitle} onClose={() => setTrailerTitle(null)} />}
    {accountOpen && <AccountModal user={user} onClose={() => setAccountOpen(false)} onUpdate={(updated) => { setUser(updated); setAccountOpen(false); }} onSignOut={signOut} />}
  </main>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movie/watch/:tmdbId" element={<VideoPlayer />} />
        <Route path="/tv/watch/:tmdbId/:season/:episode" element={<VideoPlayer />} />
      </Routes>
    </BrowserRouter>
  );
}
