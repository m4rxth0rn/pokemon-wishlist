"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";

export default function SetsPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest");

  // 📌 Kompletní seznam éry Pokémon TCG
  const eras = {
    "Scarlet & Violet": [
      "Prismatic Evolutions", "Surging Sparks", "Stellar Crown", "Shrouded Fable", "Twilight Masquerade", "Temporal Forces",
      "Paldean Fates", "Paradox Rift", "151", "Obsidian Flames", "Paldea Evolved", "Scarlet & Violet"
    ],
    "Sword & Shield": [
      "Crown Zenith", "Silver Tempest", "Lost Origin", "Pokémon GO", "Astral Radiance", "Brilliant Stars", "Fusion Strike",
      "Celebrations", "Evolving Skies", "Chilling Reign", "Battle Styles", "Shining Fates", "Vivid Voltage", "Champion's Path",
      "Darkness Ablaze", "Rebel Clash", "Sword & Shield"
    ],
    "Sun & Moon": [
      "Cosmic Eclipse", "Hidden Fates", "Unified Minds", "Unbroken Bonds", "Detective Pikachu", "Team Up", "Lost Thunder",
      "Dragon Majesty", "Celestial Storm", "Forbidden Light", "Ultra Prism", "Crimson Invasion", "Shining Legends",
      "Burning Shadows", "Guardians Rising", "Sun & Moon"
    ],
    "XY": [
      "Evolutions", "Steam Siege", "Fates Collide", "Generations", "BREAKpoint", "BREAKthrough", "Ancient Origins",
      "Roaring Skies", "Double Crisis", "Primal Clash", "Phantom Forces", "Furious Fists", "Flashfire", "XY"
    ],
    "Black & White": [
      "Legendary Treasures", "Plasma Blast", "Plasma Freeze", "Plasma Storm", "Boundaries Crossed", "Dragon Vault",
      "Dragons Exalted", "Dark Explorers", "Next Destinies", "Noble Victories", "Emerging Powers", "Black & White"
    ],
    "Diamond & Pearl": [
      "Stormfront", "Legends Awakened", "Majestic Dawn", "Great Encounters", "Secret Wonders", "Mysterious Treasures", "Diamond & Pearl"
    ],
    "EX Series": [
      "Power Keepers", "Dragon Frontiers", "Crystal Guardians", "Holon Phantoms", "Legend Maker", "Delta Species",
      "Unseen Forces", "Emerald", "Deoxys", "Team Rocket Returns", "FireRed & LeafGreen", "Hidden Legends",
      "Team Magma vs Team Aqua", "Dragon", "Sandstorm", "Ruby & Sapphire"
    ],
    "Neo Series": [
      "Neo Destiny", "Neo Revelation", "Neo Discovery", "Neo Genesis"
    ],
    "Classic": [
      "Base Set", "Base Set 2", "Jungle", "Fossil", "Team Rocket", "Gym Heroes", "Gym Challenge", "Legendary Collection"
    ],
    "Black Star Promo": ["Black Star Promo"]
  };

  // 📌 Načítáme sety z API
  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get("https://api.pokemontcg.io/v2/sets");
        setSets(res.data.data || []);
      } catch (error) {
        console.error("Chyba při načítání setů:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSets();
  }, []);

  // 📌 Funkce pro získání éry setu
  const getEra = (setName) => {
    for (const [era, setList] of Object.entries(eras)) {
      if (setList.includes(setName)) return era;
    }
    return "Jiná éra";
  };

  // 📌 Funkce pro získání data vydání setu
  const parseReleaseDate = (dateString) => {
    return dateString ? new Date(dateString) : new Date(0);
  };

  // 📌 Funkce pro řazení setů
  const sortedSets = () => {
    let sortedList = [...sets];

    if (sortOption === "a-z") {
      sortedList.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortOption === "newest") {
      sortedList.sort((a, b) => parseReleaseDate(b.releaseDate) - parseReleaseDate(a.releaseDate));
    }
    if (sortOption === "oldest") {
      sortedList.sort((a, b) => parseReleaseDate(a.releaseDate) - parseReleaseDate(b.releaseDate));
    }

    return sortedList;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📦 Seznam Pokémon setů</h1>

      {/* 🔹 Dropdown pro řazení */}
      <label>📌 Řadit podle:</label>
      <select onChange={(e) => setSortOption(e.target.value)} value={sortOption}>
        <option value="newest">Nejnovější → Nejstarší</option>
        <option value="oldest">Nejstarší → Nejnovější</option>
        <option value="a-z">Abecedně (A-Z)</option>
      </select>

      {loading && <p>⏳ Načítám sety...</p>}
      {!loading && sets.length === 0 && <p>😢 Žádné sety nenalezeny.</p>}

      {/* 🔹 Rozdělení setů podle éry */}
      {!loading &&
        Object.keys(eras).map((era) => {
          const eraSets = sortedSets().filter((set) => getEra(set.name) === era);
          if (eraSets.length === 0) return null;

          return (
            <div key={era}>
              <h2>🔹 {era}</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                {eraSets.map((set) => (
                  <Link key={set.id} href={`/sets/${set.id}`} style={{ textDecoration: "none", color: "black" }}>
                    <div style={{ textAlign: "center", border: "1px solid black", padding: "10px", cursor: "pointer" }}>
                      <img src={set.images.logo} alt={set.name} width="150" />
                      <p><strong>{set.name}</strong></p>
                      <p>🗓️ {set.releaseDate}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
