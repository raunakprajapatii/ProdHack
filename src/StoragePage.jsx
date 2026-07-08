import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Check, Headphones, Lock, Palette, ShoppingBag, Sparkles, Star, Zap, Timer } from "lucide-react";
import "./StoragePage.css";

const API_BASE = "http://localhost:3000/api";

const categoryIcons = {
  Theme: Palette,
  Playlist: Headphones,
  Booster: Zap,
  Clock: Timer,
};

function StorePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [wallet, setWallet] = useState(0);
  const [ownedItems, setOwnedItems] = useState([]);
  const [equippedItems, setEquippedItems] = useState({ Theme: "", Playlist: "", Booster: "", Clock: "classic-clock" });
  const [playlist, setPlaylist] = useState({ limit: 0, songs: [] });
  const [newSongUrl, setNewSongUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState("");

  const token = localStorage.getItem("token");

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const loadStore = async () => {
      setIsLoading(true);
      try {
        const [itemsResponse, userStoreResponse] = await Promise.all([
          fetch(`${API_BASE}/store/items`),
          fetch(`${API_BASE}/store/me`, { headers: authHeaders }),
        ]);
        const itemsData = await itemsResponse.json();
        const userStoreData = await userStoreResponse.json();

        if (!itemsResponse.ok || !userStoreResponse.ok) {
          setMessage(userStoreData.error || itemsData.error || "Could not load store.");
          return;
        }

        setItems(itemsData.items);
        setWallet(userStoreData.wallet);
        setOwnedItems(userStoreData.ownedItems);
        setEquippedItems(userStoreData.equippedItems);
        setPlaylist(userStoreData.playlist);
      } catch {
        setMessage("Could not load store.");
      } finally {
        setIsLoading(false);
      }
    };

    loadStore();
  }, [authHeaders, navigate, token]);

  const groupedItems = items.reduce((groups, item) => {
    groups[item.type] = groups[item.type] || [];
    groups[item.type].push(item);
    return groups;
  }, {});

  const updateStoreState = (data) => {
    setWallet(data.wallet);
    setOwnedItems(data.ownedItems);
    setEquippedItems(data.equippedItems);
    setPlaylist(data.playlist);
  };

  const handlePurchase = async (item) => {
    setBusyItemId(item.id);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/store/purchase`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Purchase failed.");
        return;
      }

      updateStoreState(data.store);
      setMessage(`${item.name} added to your account.`);
    } catch {
      setMessage("Purchase failed.");
    } finally {
      setBusyItemId("");
    }
  };

  const handleEquip = async (item) => {
    setBusyItemId(item.id);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/store/equip`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Equip failed.");
        return;
      }

      updateStoreState(data.store);
      setMessage(`${item.name} equipped.`);
    } catch {
      setMessage("Equip failed.");
    } finally {
      setBusyItemId("");
    }
  };

  const handleAddSong = async () => {
    if (!newSongUrl.trim()) return;

    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/store/playlist`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ songUrl: newSongUrl.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not add song.");
        return;
      }

      setPlaylist(data.playlist);
      setNewSongUrl("");
      setMessage("Track added to your playlist.");
    } catch {
      setMessage("Could not add song.");
    }
  };

  return (
    <div className="store-page-shell">
      <nav className="navbar glass-card store-nav">
        <NavLink to="/dashboard" className="nav-logo">ProdHack</NavLink>
        <ul className="nav-links">
          <li><NavLink to="/dashboard">Dashboard</NavLink></li>
          <li><NavLink to="/theme-store">Store</NavLink></li>
          <li><NavLink to="/leaderboard">Leaderboard</NavLink></li>
        </ul>
        <div className="nav-coins"><Sparkles size={16} /> {wallet} XP</div>
      </nav>

      <main className="store-container">
        <section className="store-hero-panel">
          <div>
            <p className="store-kicker">Account Store</p>
            <h1 className="store-title">Theme Store</h1>
            <p className="store-subtitle">Buy themes, playlist extenders, and focus boosts. Your owned items load automatically after login.</p>
          </div>
          <div className="owned-summary glass-card">
            <ShoppingBag />
            <span>{ownedItems.length} owned</span>
          </div>
        </section>

        {message && <div className="store-message glass-card">{message}</div>}
        {isLoading && <div className="store-message glass-card">Loading your store...</div>}

        {Object.entries(groupedItems).map(([type, typeItems]) => {
          const Icon = categoryIcons[type] || ShoppingBag;

          return (
            <section className="store-section" key={type}>
              <div className="store-section-heading">
                <Icon />
                <h2>{type}</h2>
              </div>
              <div className="items-grid">
                {typeItems.map((item) => {
                  const isOwned = ownedItems.includes(item.id);
                  const isEquipped = equippedItems[item.type] === item.id;
                  const isBusy = busyItemId === item.id;

                  return (
                    <article key={item.id} className={`item-card glass-card ${isEquipped ? "equipped-card" : ""}`}>
                      <div
                        className="item-preview"
                        style={item.timerTheme ? {
                          background: item.timerTheme.background,
                          color: item.timerTheme.timerColor,
                        } : undefined}
                      >
                        <span className="item-icon">{item.badge}</span>
                        {item.timerTheme && (
                          <span
                            className="preview-accent"
                            style={{ background: item.timerTheme.accentColor }}
                          />
                        )}
                      </div>
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-type">{item.description}</p>
                      <div className="item-perks">
                        {(item.features || [
                          item.type === "Playlist" ? "More saved tracks" : "Premium visual skin",
                          item.type === "Booster" ? "Profile flex item" : "Battle-ready style",
                        ]).slice(0, 3).map((feature) => (
                          <span key={feature}><Star size={12} /> {feature.replace(/-/g, " ")}</span>
                        ))}
                      </div>
                      <p className="item-price">{item.price} XP</p>

                      {isOwned ? (
                        <button
                          className={`btn equip-button ${isEquipped ? "equipped" : ""}`}
                          onClick={() => handleEquip(item)}
                          disabled={isBusy || isEquipped}
                        >
                          {isEquipped ? <><Check size={16} /> Equipped</> : "Equip"}
                        </button>
                      ) : (
                        <button className="btn buy-button" onClick={() => handlePurchase(item)} disabled={isBusy}>
                          {isBusy ? "Buying..." : <><Lock size={16} /> Buy</>}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="playlist-section glass-card">
          <h2 className="store-title playlist-title">Your Playlist</h2>
          <div className="spotify-input-container">
            <input
              type="text"
              placeholder="Paste a Spotify track URL here..."
              value={newSongUrl}
              onChange={(event) => setNewSongUrl(event.target.value)}
            />
            <button className="btn add-song-btn" onClick={handleAddSong}>Add Song</button>
          </div>
          <div className="playlist-count-bar">
            <div className="playlist-count-progress" style={{ width: `${Math.min(100, (playlist.songs.length / Math.max(playlist.limit, 1)) * 100)}%` }}></div>
          </div>
          <p>Playlist: {playlist.songs.length} / {playlist.limit} songs</p>
          <ul className="song-list">
            {playlist.songs.length > 0 ? playlist.songs.map((songUrl) => (
              <li key={songUrl}>{songUrl}</li>
            )) : <li>Your playlist is empty. Buy a playlist extender to unlock more slots.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}

export default StorePage;


