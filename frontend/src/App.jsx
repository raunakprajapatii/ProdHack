import { Routes, Route } from "react-router-dom";
import ProdHackHomePage from "./ProdHackHomePage";
import OneOne from "./OneOne";
import StorePage from "./StoragePage";
import LoginPage from "./LoginPage";
import PersonalP from "./PersonalP";
import LeaderboardPage from "./LeaderboardPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProdHackHomePage />} />
      <Route path="/dashboard" element={<ProdHackHomePage />} />
      <Route path="/OneOne" element={<OneOne />} />
      <Route path="/battle/:roomIdFromUrl" element={<OneOne />} />
      <Route path="/theme-store" element={<StorePage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/about-us" element={<h1>About Us Page</h1>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/PersonalP" element={<PersonalP />} />
    </Routes>
  );
}
