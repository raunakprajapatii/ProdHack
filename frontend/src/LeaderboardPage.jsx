import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Medal, Trophy, Users } from "lucide-react";
import "./LeaderboardPage.css";
import { API_BASE_URL } from "./config/api";

function LeaderboardPage() {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Could not load leaderboard.");
          return;
        }

        setPlayers(data.users);
      } catch {
        setError("Could not load leaderboard.");
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  return (
    <div className="leaderboard-page">
      <nav className="leaderboard-nav">
        <NavLink to="/dashboard" className="leaderboard-brand">ProdHack</NavLink>
        <div>
          <NavLink to="/theme-store">Store</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </div>
      </nav>

      <main className="leaderboard-main">
        <section className="leaderboard-hero">
          <div>
            <p className="leaderboard-kicker"><Trophy /> Competitive Board</p>
            <h1>Leaderboard</h1>
            <p>Players are sorted by games won, with score and total games shown for context.</p>
          </div>
          <div className="leaderboard-count"><Users /> {players.length} players</div>
        </section>

        <section className="leaderboard-table-card">
          {isLoading && <p className="leaderboard-state">Loading leaderboard...</p>}
          {error && <p className="leaderboard-state leaderboard-error">{error}</p>}
          {!isLoading && !error && (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Games Won</th>
                    <th>Games Played</th>
                    <th>Total Score</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr key={player.id}>
                      <td>
                        <span className={`rank-badge rank-${index + 1}`}>
                          {index < 3 ? <Medal /> : index + 1}
                        </span>
                      </td>
                      <td>
                        <div className="leaderboard-player">
                          {player.profilePic ? (
                            <img src={player.profilePic} alt={player.displayName} />
                          ) : (
                            <span>{player.displayName.slice(0, 2).toUpperCase()}</span>
                          )}
                          <div>
                            <strong>{player.displayName}</strong>
                            <small>{player.username}</small>
                          </div>
                        </div>
                      </td>
                      <td>{player.gamesWon}</td>
                      <td>{player.gamesPlayed}</td>
                      <td>{player.totalScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default LeaderboardPage;
