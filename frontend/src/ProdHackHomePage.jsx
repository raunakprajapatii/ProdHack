import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Calendar,
  Camera,
  LogOut,
  Mail,
  Pencil,
  Save,
  School,
  Settings,
  Sparkles,
  Timer,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import logo from "./assets/logo.svg";
import "./ProdHackHomePage.css";
import MusicPlayer from "./Music";
import { API_BASE_URL } from "./config/api";

const featuresData = [
  { icon: Timer, title: "Smart Timer Sessions", description: "Pomodoro technique enhanced with AI-powered break suggestions and focus optimization.", color: "feature-pink" },
  { icon: Trophy, title: "Competitive Battles", description: "Challenge friends and colleagues in productivity battles with real-time leaderboards.", color: "feature-blue" },
  { icon: Zap, title: "Achievement System", description: "Unlock badges, level up your productivity stats, and track your growth over time.", color: "feature-yellow" },
];

const statsData = [
  { number: "50K+", label: "Active Users" },
  { number: "2M+", label: "Sessions Completed" },
  { number: "95%", label: "Productivity Increase" },
];

const footerSections = [
  { title: "Product", links: ["Features", "Pricing", "Updates", "Beta"] },
  { title: "Community", links: ["Discord", "Forums", "Leaderboards", "Events"] },
  { title: "Support", links: ["Help Center", "Contact", "Bug Reports", "Feature Requests"] },
];

export default function ProdHackHomePage() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    email: "",
    dob: "",
    educationCentre: "",
    profilePic: "",
  });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setCurrentUser(null);
          return;
        }

        localStorage.setItem("user", JSON.stringify(data.user));
        setCurrentUser(data.user);
      } catch {
        setAccountError("Could not load account details.");
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const profile = currentUser?.profile || {};
    setProfileForm({
      displayName: profile.displayName || currentUser?.username || "",
      email: currentUser?.email || "",
      dob: profile.dob ? profile.dob.slice(0, 10) : "",
      educationCentre: profile.educationCentre || "",
      profilePic: profile.profilePic || "",
    });
  }, [currentUser]);

  const navLinks = {
    "1 vs 1": "/OneOne",
    "Theme Store": "/theme-store",
    "Leaderboard": "/leaderboard",
    "About Us": "/about-us",
  };

  const navItems = Object.keys(navLinks);
  const profile = currentUser?.profile || {};
  const displayName = profile.displayName || currentUser?.username || "Player";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PH";

  const handleProfilePicChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((prev) => ({
        ...prev,
        profilePic: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAccountChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveAccount = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setIsSavingAccount(true);
    setAccountError("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();

      if (!response.ok) {
        setAccountError(data.error || "Could not update account.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsEditingAccount(false);
    } catch {
      setAccountError("Could not update account.");
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setCurrentUser(null);
    setIsAccountOpen(false);
    navigate("/login");
  };

  return (
    <div className="homepage">
      <header className={`header ${isScrolled ? "header-scrolled" : ""}`}>
        <div className="header-container">
          <div className="logo">
            <img src={logo} alt="ProdHack Logo" className="logo-img" />
          </div>
          <h1>ProdHack</h1>
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink key={item} to={navLinks[item]} className="nav-link">
                {item}
                <span className="nav-underline"></span>
              </NavLink>
            ))}
            {currentUser ? (
              <div className="account-menu">
                <button
                  className="account-trigger"
                  type="button"
                  onClick={() => setIsAccountOpen((isOpen) => !isOpen)}
                  aria-label="Open account settings"
                >
                  {profile.profilePic ? (
                    <img src={profile.profilePic} alt={displayName} className="account-avatar-img" />
                  ) : (
                    <span className="account-avatar-fallback">{initials}</span>
                  )}
                  <span className="account-trigger-name">{displayName}</span>
                  <Settings className="account-trigger-icon" />
                </button>

                {isAccountOpen && (
                  <div className="account-panel">
                    <div className="account-panel-header">
                      <div className="account-panel-user">
                        {profileForm.profilePic ? (
                          <img src={profileForm.profilePic} alt={displayName} className="account-panel-avatar" />
                        ) : (
                          <div className="account-panel-avatar account-panel-avatar-fallback">{initials}</div>
                        )}
                        <div>
                          <h3>{displayName}</h3>
                          <p>{currentUser.email}</p>
                        </div>
                      </div>
                      <button className="account-icon-button" type="button" onClick={() => setIsAccountOpen(false)} aria-label="Close account settings">
                        <X />
                      </button>
                    </div>

                    <form className="account-form" onSubmit={handleSaveAccount}>
                      <label className={`account-photo-picker ${!isEditingAccount ? "account-photo-picker-disabled" : ""}`}>
                        <Camera />
                        <span>Add profile pic</span>
                        <input type="file" accept="image/*" onChange={handleProfilePicChange} disabled={!isEditingAccount} />
                      </label>

                      <label>
                        <span><User /> Display name</span>
                        <input name="displayName" value={profileForm.displayName} onChange={handleAccountChange} disabled={!isEditingAccount} />
                      </label>

                      <label>
                        <span><Mail /> Email</span>
                        <input name="email" type="email" value={profileForm.email} onChange={handleAccountChange} disabled={!isEditingAccount} />
                      </label>

                      <label>
                        <span><Calendar /> DOB</span>
                        <input name="dob" type="date" value={profileForm.dob} onChange={handleAccountChange} disabled={!isEditingAccount} />
                      </label>

                      <label>
                        <span><School /> Education Centre</span>
                        <input name="educationCentre" value={profileForm.educationCentre} onChange={handleAccountChange} disabled={!isEditingAccount} placeholder="School, college, or institute" />
                      </label>

                      {accountError && <p className="account-error">{accountError}</p>}

                      <div className="account-actions">
                        {isEditingAccount ? (
                          <button className="account-save-button" type="submit" disabled={isSavingAccount}>
                            <Save /> {isSavingAccount ? "Saving..." : "Save"}
                          </button>
                        ) : (
                          <button
                            className="account-edit-button"
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              setAccountError("");
                              setIsSavingAccount(false);
                              setIsEditingAccount(true);
                            }}
                          >
                            <Pencil /> Edit account info
                          </button>
                        )}
                        <button className="account-logout-button" type="button" onClick={handleLogout}>
                          <LogOut /> Logout
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/login" className="nav-link">
                <button className="btn-primary">Login/Sign Up</button>
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="hero-title-container">
            <h1 className="hero-title">
              Level Up <span className="gradient-text">Study Mode</span>
            </h1>
          </div>
          <p className="hero-subtitle">
            Turn study sessions into quests, focus streaks, and friendly battles that make learning feel alive.
          </p>
          <div className="hero-buttons">
            <NavLink to="/PersonalP">
              <button className="btn-primary pulse">
                <Sparkles className="inline-icon" /> Start Hacking Now
              </button>
            </NavLink>
            <button className="btn-secondary">Watch Demo</button>
          </div>
          <div className="features">
            {featuresData.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className={`feature-icon ${feature.color}`}>
                  <feature.icon className="icon-white" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="stats">
          <div className="stats-container">
            <h2 className="stats-title">Join the Productivity Revolution</h2>
            <div className="stats-grid">
              {statsData.map((stat, index) => (
                <div key={index} className="stat">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="cta-container">
            <h2 className="cta-title">Ready to Level Up?</h2>
            <p className="cta-subtitle">
              Join thousands of productivity hackers who've transformed their work habits into an exciting game.
            </p>
            <button className="btn-primary pulse">
              <Users className="inline-icon-lg" /> Join ProdHack Today
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-about">
              <div className="footer-logo">
                <img src={logo} alt="ProdHack Logo" className="logo-img" />
                <h2>ProdHack</h2>
              </div>
              <h3 className="footer-text">
                Revolutionizing productivity through gamification and competitive engagement.
              </h3>
            </div>
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="footer-title">{section.title}</h4>
                <ul className="footer-links">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="footer-link">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <h2 className="footer-copy">
              Copyright 2025 ProdHack. Made for productive humans.
            </h2>
          </div>
        </div>
      </footer>
      <MusicPlayer />
    </div>
  );
}

