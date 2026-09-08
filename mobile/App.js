import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import VideoPlayer from "./components/VideoPlayer";

const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000/api";
const mobileTokenKey = "haruka_mobile_session";
const rails = [["trending", "Trending Today", "PULSE CHECK"], ["haruka-only", "Only on Haruka", "EXCLUSIVELY HERE"], ["top-rated", "Top Rated", "CROWD FAVORITES"], ["comedy", "Comedy", "LIGHTER SIDE"], ["horror", "Horror", "AFTER DARK"]];

async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(data.message || "Haruka could not complete this request.");
  return data;
}

function Poster({ title, onPress }) {
  return <Pressable style={styles.posterCard} onPress={onPress} accessibilityRole="button" accessibilityLabel={`View ${title.title}`}>
    {title.poster ? <Image source={{ uri: title.poster }} style={styles.poster} /> : <View style={[styles.poster, styles.posterFallback]}><Text style={styles.posterFallbackText}>HARUKA</Text></View>}
    <View style={styles.posterShade} /><View style={styles.posterInfo}><Text numberOfLines={1} style={styles.posterTitle}>{title.title}</Text><Text style={styles.posterMeta}>{title.year || "Soon"} · ★ {title.rating}</Text></View>
  </Pressable>;
}

function AuthSheet({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signup = mode === "signup";
  const submit = async () => {
    setBusy(true); setError("");
    try {
      if (signup) {
        const result = await api("/auth/signup", { method: "POST", body: form });
        Alert.alert("Account submitted", result.message || "Your account is awaiting approval.");
        setMode("signin");
      } else {
        const result = await api("/auth/mobile/signin", { method: "POST", body: form });
        await SecureStore.setItemAsync(mobileTokenKey, result.token);
        onAuthenticated(result.user, result.token);
      }
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={() => {}}>
    <View style={styles.sheetHandle} /><Text style={styles.eyebrow}>HARUKA ACCOUNT</Text><Text style={styles.sheetTitle}>{signup ? "Join Haruka" : "Welcome back"}</Text><Text style={styles.sheetCopy}>{signup ? "New member accounts are reviewed before sign-in is enabled." : "Sign in to use My List on this device."}</Text>
    {signup && <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#8390aa" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoCapitalize="words" />}
    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8390aa" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" keyboardType="email-address" />
    <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8390aa" value={form.password} onChangeText={(password) => setForm({ ...form, password })} secureTextEntry />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
    <Pressable style={styles.primaryButton} onPress={submit} disabled={busy}><Text style={styles.primaryButtonText}>{busy ? "Please wait..." : signup ? "Create account" : "Sign in"}</Text></Pressable>
    <Pressable onPress={() => { setMode(signup ? "signin" : "signup"); setError(""); }}><Text style={styles.switchAuth}>{signup ? "Already approved? Sign in" : "Need an account? Sign up"}</Text></Pressable>
  </Pressable></Pressable></Modal>;
}

function DetailSheet({ title, token, onClose, onSave, onSignIn, onWatchNow }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (!title) return null;
  const openTrailer = async () => { setBusy(true); setError(""); try { const trailer = await api(`/titles/${title.mediaType}/${title.id}/trailer`); await Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`); } catch (requestError) { setError(requestError.message); } finally { setBusy(false); } };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={() => {}}>
    <View style={styles.sheetHandle} /><Text style={styles.eyebrow}>HARUKA SELECTS · {title.mediaType === "tv" ? "SERIES" : "FILM"}</Text><Text style={styles.sheetTitle}>{title.title}</Text><Text style={styles.detailMeta}>{title.year || "—"} · ★ {title.rating}</Text><Text style={styles.overview}>{title.overview || "A title waiting to be discovered on Haruka."}</Text>
    <Pressable style={styles.watchNowButton} onPress={() => onWatchNow(title)}><Text style={styles.watchNowButtonText}>▶ Watch Now</Text></Pressable>
    <Pressable style={styles.primaryButton} onPress={openTrailer} disabled={busy}><Text style={styles.primaryButtonText}>{busy ? "Opening trailer..." : "▶ Watch official trailer"}</Text></Pressable>
    {token ? <Pressable style={styles.secondaryButton} onPress={() => onSave(title)}><Text style={styles.secondaryButtonText}>＋ Add to My List</Text></Pressable> : <Pressable style={styles.secondaryButton} onPress={onSignIn}><Text style={styles.secondaryButtonText}>Sign in to use My List</Text></Pressable>}
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </Pressable></Pressable></Modal>;
}

function MyListItem({ title, onSelect, onRemove }) {
  return <View style={{ alignItems: "center", gap: 6 }}><Poster title={{ ...title, id: title.tmdbId }} onPress={() => onSelect({ ...title, id: title.tmdbId })} /><Pressable onPress={() => onRemove(title)}><Text style={{ color: "#ffaba2", fontSize: 11, fontWeight: "900" }}>Remove</Text></Pressable></View>;
}

function MyListSheet({ titles, loading, onClose, onSelect, onRemove }) {
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.listSheet} onPress={() => {}}><View style={styles.sheetHandle} /><Text style={styles.eyebrow}>YOUR LIBRARY</Text><Text style={styles.sheetTitle}>My List</Text>{loading ? <ActivityIndicator color="#b2ff71" style={styles.loader} /> : !titles.length ? <Text style={styles.sheetCopy}>Your saved titles will appear here.</Text> : <ScrollView contentContainerStyle={styles.listGrid}>{titles.map((title) => <MyListItem key={`${title.tmdbId}-${title.mediaType}`} title={title} onSelect={onSelect} onRemove={onRemove} />)}</ScrollView>}</Pressable></Pressable></Modal>;
}

const accountStyles = StyleSheet.create({
  navActions: { alignItems: "center", flexDirection: "row", gap: 13 }, avatarButton: { padding: 3 }, avatar: { height: 34, width: 34, alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "#b2ff71", borderRadius: 17, backgroundColor: "transparent" }, avatarLarge: { height: 54, width: 54, alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "#b2ff71", borderRadius: 27, backgroundColor: "#111d31" }, avatarHead: { height: 11, width: 11, marginTop: 7, borderRadius: 8, backgroundColor: "#b2ff71" }, avatarBody: { height: 15, width: 23, marginTop: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: "#b2ff71" }, profileHero: { alignItems: "center", flexDirection: "row", gap: 14, marginBottom: 25 }, roleBadge: { alignSelf: "flex-start", marginTop: 7, paddingHorizontal: 7, paddingVertical: 3, color: "#09111f", borderRadius: 3, backgroundColor: "#b2ff71", fontSize: 9, fontWeight: "900", textTransform: "uppercase" }, sectionLabel: { marginTop: 27 }, adminSheet: { maxHeight: "90%", padding: 25, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#111d31" }, typeRow: { flexDirection: "row", gap: 9, marginTop: 12 }, typeButton: { flex: 1, alignItems: "center", padding: 11, borderWidth: 1, borderColor: "#536383", borderRadius: 5 }, typeActive: { borderColor: "#b2ff71", backgroundColor: "#1c3026" }, typeText: { color: "#edf2ff", fontSize: 12, fontWeight: "800" }, adminRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#283650" }, rowCopy: { flex: 1 }, rowTitle: { color: "#f4f7ff", fontSize: 13, fontWeight: "800" }, actionColumn: { alignItems: "flex-end", gap: 7 }, actionText: { color: "#b2ff71", fontSize: 11, fontWeight: "900" }, deleteText: { color: "#ffaba2", marginTop: 8, fontSize: 11, fontWeight: "900" }
});

function ProfileSheet({ user, token, onClose, onUpdate, onSignOut, onOpenList }) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
  const updateName = async () => { try { const result = await api("/auth/me", { method: "PATCH", token, body: { name } }); onUpdate(result.user); setNotice("Profile updated."); } catch (error) { setNotice(error.message); } };
  const updatePassword = async () => { try { await api("/auth/me/password", { method: "PATCH", token, body: { currentPassword, newPassword } }); setCurrentPassword(""); setNewPassword(""); setNotice("Password updated."); } catch (error) { setNotice(error.message); } };
  const roleName = user.role === "superadmin" ? "Super Admin" : user.role === "admin" ? "Admin" : "Member";
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={() => {}}><View style={styles.sheetHandle} /><View style={accountStyles.profileHero}><View style={accountStyles.avatarLarge}><View style={accountStyles.avatarHead} /><View style={accountStyles.avatarBody} /></View><View><Text style={styles.sheetTitle}>{user.name}</Text><Text style={styles.sheetCopy}>{user.email}</Text><Text style={accountStyles.roleBadge}>{roleName}</Text></View></View><Text style={styles.eyebrow}>PROFILE</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor="#8390aa" /><Pressable style={styles.secondaryButton} onPress={updateName}><Text style={styles.secondaryButtonText}>Save profile</Text></Pressable><Pressable style={styles.secondaryButton} onPress={() => { onClose(); onOpenList(); }}><Text style={styles.secondaryButtonText}>Open My List</Text></Pressable><Text style={[styles.eyebrow, accountStyles.sectionLabel]}>CHANGE PASSWORD</Text><TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" placeholderTextColor="#8390aa" secureTextEntry /><TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="New password (8+ characters)" placeholderTextColor="#8390aa" secureTextEntry /><Pressable style={styles.secondaryButton} onPress={updatePassword}><Text style={styles.secondaryButtonText}>Update password</Text></Pressable>{notice ? <Text style={styles.errorText}>{notice}</Text> : null}<Pressable onPress={onSignOut}><Text style={styles.signOut}>Sign out</Text></Pressable></Pressable></Pressable></Modal>;
}

function AdminStudioSheet({ user, token, onClose }) {
  const [users, setUsers] = useState([]), [titles, setTitles] = useState([]), [tmdbId, setTmdbId] = useState(""), [mediaType, setMediaType] = useState("movie"), [notice, setNotice] = useState("");
  const load = async () => { try { const [exclusiveData, userData] = await Promise.all([api("/admin/exclusives", { token }), api("/admin/users", { token })]); setTitles(exclusiveData.results); setUsers(userData.results); } catch (error) { setNotice(error.message); } };
  useEffect(() => { load(); }, []);
  const act = async (path, options = {}) => { try { await api(path, { token, ...options }); await load(); } catch (error) { setNotice(error.message); } };
  const canManage = (account) => account.id !== user.id && account.role !== "superadmin" && (user.role === "superadmin" || account.role === "user");
  const addTitle = async () => { if (!tmdbId.trim()) return; await act("/admin/exclusives", { method: "POST", body: { tmdbId: Number(tmdbId), mediaType } }); setTmdbId(""); };
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.backdrop} onPress={onClose}><Pressable style={accountStyles.adminSheet} onPress={() => {}}><View style={styles.sheetHandle} /><ScrollView showsVerticalScrollIndicator={false}><Text style={styles.eyebrow}>ADMIN STUDIO</Text><Text style={styles.sheetTitle}>Only on Haruka</Text><Text style={styles.sheetCopy}>Catalog and member controls follow the same permissions as the web Admin Studio.</Text><TextInput style={styles.input} value={tmdbId} onChangeText={setTmdbId} keyboardType="number-pad" placeholder="TMDB ID" placeholderTextColor="#8390aa" /><View style={accountStyles.typeRow}><Pressable style={[accountStyles.typeButton, mediaType === "movie" && accountStyles.typeActive]} onPress={() => setMediaType("movie")}><Text style={accountStyles.typeText}>Movie</Text></Pressable><Pressable style={[accountStyles.typeButton, mediaType === "tv" && accountStyles.typeActive]} onPress={() => setMediaType("tv")}><Text style={accountStyles.typeText}>Series</Text></Pressable></View><Pressable style={styles.primaryButton} onPress={addTitle}><Text style={styles.primaryButtonText}>Add exclusive</Text></Pressable>{titles.map((title) => <View key={title._id} style={accountStyles.adminRow}><View style={accountStyles.rowCopy}><Text style={accountStyles.rowTitle}>{title.title}</Text><Text style={styles.sheetCopy}>{title.isPublished !== false ? "Published" : "Unpublished"}</Text></View><View><Pressable onPress={() => act(`/admin/exclusives/${title._id}`, { method: "PATCH", body: { isPublished: title.isPublished === false } })}><Text style={accountStyles.actionText}>{title.isPublished !== false ? "Unpublish" : "Publish"}</Text></Pressable><Pressable onPress={() => act(`/admin/exclusives/${title._id}`, { method: "DELETE" })}><Text style={accountStyles.deleteText}>Remove</Text></Pressable></View></View>)}<Text style={[styles.eyebrow, accountStyles.sectionLabel]}>TEAM ACCESS</Text>{users.map((account) => <View key={account.id} style={accountStyles.adminRow}><View style={accountStyles.rowCopy}><Text style={accountStyles.rowTitle}>{account.name}</Text><Text style={styles.sheetCopy}>{account.email} · {account.role} · {!account.isActive ? "Deactivated" : account.approvalStatus === "pending" ? "Awaiting approval" : "Active"}</Text></View>{canManage(account) && <View style={accountStyles.actionColumn}>{account.role === "user" && account.approvalStatus === "pending" && <Pressable onPress={() => act(`/admin/users/${account.id}/approval`, { method: "PATCH" })}><Text style={accountStyles.actionText}>Approve</Text></Pressable>}<Pressable onPress={() => act(`/admin/users/${account.id}/status`, { method: "PATCH", body: { isActive: !account.isActive } })}><Text style={accountStyles.actionText}>{account.isActive ? "Deactivate" : "Reactivate"}</Text></Pressable>{user.role === "superadmin" && <Pressable onPress={() => act(`/admin/users/${account.id}/role`, { method: "PATCH", body: { role: account.role === "admin" ? "user" : "admin" } })}><Text style={accountStyles.actionText}>{account.role === "admin" ? "Make member" : "Make admin"}</Text></Pressable>}<Pressable onPress={() => Alert.alert("Delete account", `Permanently delete ${account.name}?`, [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => act(`/admin/users/${account.id}`, { method: "DELETE" }) }])}><Text style={accountStyles.deleteText}>Delete</Text></Pressable></View>}</View>)}{notice ? <Text style={styles.errorText}>{notice}</Text> : null}</ScrollView></Pressable></Pressable></Modal>;
}

export default function App() {
  const [type, setType] = useState("movie"), [catalog, setCatalog] = useState({}), [selected, setSelected] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [user, setUser] = useState(null), [token, setToken] = useState(null), [authOpen, setAuthOpen] = useState(false), [listOpen, setListOpen] = useState(false), [list, setList] = useState([]), [listLoading, setListLoading] = useState(false), [profileOpen, setProfileOpen] = useState(false), [adminOpen, setAdminOpen] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [videoData, setVideoData] = useState({ tmdbId: null, type: 'movie', season: null, episode: null });

  useEffect(() => { SecureStore.getItemAsync(mobileTokenKey).then(async (savedToken) => { if (!savedToken) return; try { const result = await api("/auth/me", { token: savedToken }); setToken(savedToken); setUser(result.user); } catch { await SecureStore.deleteItemAsync(mobileTokenKey); } }); }, []);
  useEffect(() => { let mounted = true; setLoading(true); setError(""); Promise.all(rails.map(async ([key]) => [key, (await api(`/discover/${key}?type=${type}`)).results])).then((entries) => mounted && setCatalog(Object.fromEntries(entries))).catch((requestError) => mounted && setError(requestError.message)).finally(() => mounted && setLoading(false)); return () => { mounted = false; }; }, [type]);
  const feature = catalog.trending?.[0];
  const openTitle = (title) => { setSelected(title); if (token) api("/me/recent", { method: "PUT", token, body: title }).catch(() => {}); };
  const loadList = async () => { if (!token) return; setListLoading(true); try { setList((await api("/me/watchlist", { token })).results); } catch (requestError) { Alert.alert("My List", requestError.message); } finally { setListLoading(false); } };
  const openList = () => { setListOpen(true); loadList(); };
  const saveTitle = async (title) => { try { await api("/me/watchlist", { method: "POST", token, body: { tmdbId: title.id, mediaType: title.mediaType } }); Alert.alert("My List", `${title.title} was added to My List.`); } catch (requestError) { Alert.alert("My List", requestError.message); } };
  const removeTitle = async (title) => { try { await api(`/me/watchlist/${title.tmdbId}?type=${encodeURIComponent(title.mediaType)}`, { method: "DELETE", token }); setList((current) => current.filter((item) => !(item.tmdbId === title.tmdbId && item.mediaType === title.mediaType))); } catch (requestError) { Alert.alert("My List", requestError.message); } };
  const signOut = async () => { await SecureStore.deleteItemAsync(mobileTokenKey); setToken(null); setUser(null); setListOpen(false); };
  
  const handleWatchNow = (title) => {
    setSelected(null);
    if (title.mediaType === 'tv') {
      setVideoData({
        tmdbId: title.id,
        type: 'tv',
        season: 1,
        episode: 1,
      });
    } else {
      setVideoData({
        tmdbId: title.id,
        type: 'movie',
        season: null,
        episode: null,
      });
    }
    setVideoVisible(true);
  };

  const handleCloseVideo = () => {
    setVideoVisible(false);
    setVideoData({ tmdbId: null, type: 'movie', season: null, episode: null });
  };

  return <SafeAreaProvider><SafeAreaView style={styles.safeArea}><StatusBar barStyle="light-content" /><ExpoStatusBar style="light" /><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.nav}><View style={styles.brand}><Image source={require("./assets/icon.png")} style={styles.brandMark} /><Text style={styles.brandText}>HARUKA</Text></View>{user ? <View style={accountStyles.navActions}>{["admin", "superadmin"].includes(user.role) && <Pressable onPress={() => setAdminOpen(true)}><Text style={styles.navText}>ADMIN</Text></Pressable>}<Pressable style={accountStyles.avatarButton} onPress={() => setProfileOpen(true)} accessibilityRole="button" accessibilityLabel="Open profile"><View style={accountStyles.avatar}><View style={accountStyles.avatarHead} /><View style={accountStyles.avatarBody} /></View></Pressable></View> : <Pressable onPress={() => setAuthOpen(true)}><Text style={styles.navText}>SIGN IN</Text></Pressable>}</View>
    <View style={heroStyles.panel}><View style={heroStyles.imageStage}>{feature?.backdrop ? <Image source={{ uri: feature.backdrop }} style={heroStyles.backdrop} resizeMode="contain" /> : <View style={heroStyles.fallbackBackdrop} />}<View style={heroStyles.imageTint} /></View><View style={heroStyles.content}><Text style={heroStyles.kicker}>HARUKA FEATURE</Text><Text numberOfLines={2} style={heroStyles.title}>{feature?.title || "Stories worth staying up for."}</Text><Text style={heroStyles.meta}>{feature?.year || "NOW SHOWING"} {feature?.rating ? `· ★ ${feature.rating}` : ""}</Text><Text numberOfLines={3} style={heroStyles.copy}>{feature?.overview || "Haruka brings your favorite worlds together in one calm, cinematic space."}</Text>{feature && <Pressable style={heroStyles.action} onPress={() => openTitle(feature)}><Text style={heroStyles.actionText}>▶ Explore title</Text></Pressable>}</View></View>
    <View style={styles.switcher}><Text style={styles.switcherLabel}>Show me</Text><Pressable style={[styles.switchButton, type === "movie" && styles.switchActive]} onPress={() => setType("movie")}><Text style={[styles.switchText, type === "movie" && styles.switchTextActive]}>Movies</Text></Pressable><Pressable style={[styles.switchButton, type === "tv" && styles.switchActive]} onPress={() => setType("tv")}><Text style={[styles.switchText, type === "tv" && styles.switchTextActive]}>Series</Text></Pressable></View>
    {loading ? <ActivityIndicator color="#b2ff71" size="large" style={styles.loader} /> : null}{error ? <View style={styles.errorPanel}><Text style={styles.errorTitle}>Could not reach Haruka</Text><Text style={styles.errorText}>{error}</Text></View> : null}
    {!loading && !error && rails.map(([key, name, label]) => <View style={styles.rail} key={key}><Text style={styles.eyebrow}>{label}</Text><Text style={styles.railTitle}>{name}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{(catalog[key] || []).map((title) => <Poster key={title.id} title={title} onPress={() => openTitle(title)} />)}</ScrollView></View>)}
    {user ? <Pressable onPress={signOut}><Text style={styles.signOut}>Sign out {user.name}</Text></Pressable> : null}<Text style={styles.footer}>HARUKA · made for your next favorite story.</Text>
  </ScrollView>
  <DetailSheet 
    title={selected} 
    token={token} 
    onClose={() => setSelected(null)} 
    onSave={saveTitle} 
    onSignIn={() => { setSelected(null); setAuthOpen(true); }} 
    onWatchNow={handleWatchNow}
  />
  {authOpen && <AuthSheet onClose={() => setAuthOpen(false)} onAuthenticated={(nextUser, nextToken) => { setUser(nextUser); setToken(nextToken); setAuthOpen(false); }} />}
  {listOpen && <MyListSheet titles={list} loading={listLoading} onClose={() => setListOpen(false)} onSelect={(title) => { setListOpen(false); openTitle(title); }} onRemove={removeTitle} />}
  {profileOpen && <ProfileSheet user={user} token={token} onClose={() => setProfileOpen(false)} onUpdate={setUser} onOpenList={openList} onSignOut={signOut} />}
  {adminOpen && <AdminStudioSheet user={user} token={token} onClose={() => setAdminOpen(false)} />}
  <VideoPlayer 
    visible={videoVisible} 
    tmdbId={videoData.tmdbId} 
    type={videoData.type} 
    season={videoData.season} 
    episode={videoData.episode} 
    onClose={handleCloseVideo} 
  />
  </SafeAreaView></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#08111f" }, page: { paddingBottom: 36 }, nav: { height: 82, paddingTop: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "space-between", flexDirection: "row" }, brand: { alignItems: "center", flexDirection: "row", gap: 8 }, brandMark: { height: 28, width: 28, resizeMode: "contain" }, brandText: { color: "#f4f7ff", fontSize: 18, fontWeight: "900", letterSpacing: 3 }, navText: { color: "#b2ff71", fontSize: 11, fontWeight: "900", letterSpacing: 1.5 }, eyebrow: { color: "#b2ff71", fontSize: 10, fontWeight: "900", letterSpacing: 1.6 }, switcher: { alignSelf: "center", marginVertical: 25, padding: 4, borderRadius: 99, backgroundColor: "#111d31", alignItems: "center", flexDirection: "row", gap: 3 }, switcherLabel: { color: "#9eabc2", marginHorizontal: 9, fontSize: 12, fontWeight: "700" }, switchButton: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99 }, switchActive: { backgroundColor: "#eef4ff" }, switchText: { color: "#aebbd3", fontSize: 13, fontWeight: "800" }, switchTextActive: { color: "#0d1728" }, loader: { marginVertical: 32 }, rail: { marginTop: 13 }, railTitle: { color: "#f4f7ff", marginTop: 5, marginLeft: 18, fontSize: 24, fontWeight: "800" }, row: { gap: 11, paddingHorizontal: 18, paddingTop: 13 }, posterCard: { height: 220, width: 144, overflow: "hidden", borderRadius: 9, backgroundColor: "#17243d" }, poster: { height: "100%", width: "100%" }, posterFallback: { alignItems: "center", justifyContent: "center" }, posterFallbackText: { color: "#b2ff71", fontSize: 12, fontWeight: "900", letterSpacing: 1 }, posterShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4, 10, 22, .18)" }, posterInfo: { position: "absolute", right: 9, bottom: 9, left: 9 }, posterTitle: { color: "#fff", fontSize: 13, fontWeight: "800" }, posterMeta: { color: "#d4deef", marginTop: 3, fontSize: 10 }, backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, .7)" }, sheet: { maxHeight: "88%", padding: 25, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#111d31" }, listSheet: { maxHeight: "85%", minHeight: 380, padding: 25, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#111d31" }, sheetHandle: { alignSelf: "center", height: 4, width: 38, marginBottom: 22, borderRadius: 5, backgroundColor: "#536383" }, sheetTitle: { color: "#f4f7ff", marginTop: 8, fontSize: 29, fontWeight: "800" }, sheetCopy: { color: "#aebbd3", marginTop: 12, fontSize: 14, lineHeight: 20 }, detailMeta: { color: "#b2ff71", marginTop: 8, fontSize: 13, fontWeight: "800" }, overview: { color: "#cad5e8", marginTop: 16, fontSize: 14, lineHeight: 21 }, input: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: "#34425e", borderRadius: 6, color: "#fff", backgroundColor: "#09101e" }, primaryButton: { alignItems: "center", marginTop: 18, padding: 15, borderRadius: 6, backgroundColor: "#b2ff71" }, primaryButtonText: { color: "#09111f", fontWeight: "900" }, secondaryButton: { alignItems: "center", marginTop: 10, padding: 14, borderWidth: 1, borderColor: "#536383", borderRadius: 6 }, secondaryButtonText: { color: "#f4f7ff", fontWeight: "800" }, watchNowButton: { alignItems: "center", marginTop: 18, padding: 15, borderRadius: 6, backgroundColor: "#e50914" }, watchNowButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 }, switchAuth: { color: "#b2ff71", marginTop: 20, fontSize: 12, fontWeight: "800", textAlign: "center" }, listGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 18 }, errorPanel: { margin: 20, padding: 18, borderRadius: 10, backgroundColor: "#3d1e23" }, errorTitle: { color: "#fff", fontWeight: "900" }, errorText: { color: "#ffc5c0", marginTop: 8, fontSize: 12, lineHeight: 17 }, signOut: { color: "#ffaba2", marginTop: 34, fontSize: 12, fontWeight: "800", textAlign: "center" }, footer: { color: "#71809b", marginTop: 18, fontSize: 11, textAlign: "center" }
});

const heroStyles = StyleSheet.create({
  panel: { backgroundColor: "#08111f" }, imageStage: { height: 215, overflow: "hidden", backgroundColor: "#111d31" }, backdrop: { height: "100%", width: "100%" }, fallbackBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#1b2a43" }, imageTint: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(4, 9, 19, .12)" }, content: { marginTop: -16, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, backgroundColor: "#08111f", borderTopLeftRadius: 22, borderTopRightRadius: 22 }, kicker: { color: "#b2ff71", marginBottom: 8, fontSize: 10, fontWeight: "900", letterSpacing: 2 }, title: { color: "#fff", maxWidth: 330, fontSize: 42, fontWeight: "900", letterSpacing: -1.5, lineHeight: 45 }, meta: { color: "#d8e1f1", marginTop: 9, fontSize: 12, fontWeight: "800" }, copy: { color: "#e2e8f4", maxWidth: 350, marginTop: 12, fontSize: 14, lineHeight: 20 }, action: { alignSelf: "flex-start", marginTop: 19, paddingHorizontal: 19, paddingVertical: 13, borderRadius: 5, backgroundColor: "#f4f7ff" }, actionText: { color: "#09111f", fontSize: 13, fontWeight: "900" }
});
