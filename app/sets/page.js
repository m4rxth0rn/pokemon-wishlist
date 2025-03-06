"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

export default function SetsPage() {
  const [sets, setSets] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest"); // ✅ Výchozí řazení: Od nejnovějších po nejstarší

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get("https://api.pokemontcg.io/v2/sets");

        // 📌 Seskupíme sety podle série
        const groupedSets = res.data.data.reduce((acc, set) => {
          if (!acc[set.series]) acc[set.series] = [];
          acc[set.series].push(set);
          return acc;
        }, {});

        setSets(groupedSets);
      } catch (error) {
        console.error("Chyba při načítání setů:", error);
      }
      setLoading(false);
    };

    fetchSets();
  }, []);

  // 📌 Funkce pro formátování data (YYYY-MM-DD → DD.MM.YYYY)
  const formatDate = (dateString) => {
    if (!dateString) return "Neznámé datum";
    const date = new Date(dateString);
    return date.toLocaleDateString("cs-CZ"); // Český formát datumu
  };

  // 📌 Funkce pro řazení sérií (jen pokud není abecední řazení)
  const sortSeries = (seriesArray) => {
    if (sortOption === "newest") {
      return seriesArray.sort((a, b) => {
        const latestA = Math.max(...sets[a].map(s => new Date(s.releaseDate)));
        const latestB = Math.max(...sets[b].map(s => new Date(s.releaseDate)));
        return latestB - latestA;
      });
    } else if (sortOption === "oldest") {
      return seriesArray.sort((a, b) => {
        const latestA = Math.max(...sets[a].map(s => new Date(s.releaseDate)));
        const latestB = Math.max(...sets[b].map(s => new Date(s.releaseDate)));
        return latestA - latestB;
      });
    }
    return seriesArray;
  };

  // 📌 Funkce pro řazení všech setů
  const sortAllSets = (setsArray) => {
    if (sortOption === "alphabetical") {
      return setsArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "newest") {
      return setsArray.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
    } else if (sortOption === "oldest") {
      return setsArray.sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate));
    }
    return setsArray;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📦 Pokémon Sety</h1>

      {/* 📌 Dropdown pro výběr řazení */}
      <label>Seřadit podle: </label>
      <select value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
        <option value="newest">🆕 Od nejnovějších po nejstarší</option>
        <option value="oldest">📅 Od nejstarších po nejnovější</option>
        <option value="alphabetical">🔤 Abecedně (A-Z)</option>
      </select>

      {loading && <p>⏳ Načítám sety...</p>}

      {!loading && sortOption === "alphabetical" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {sortAllSets(Object.values(sets).flat()).map((set) => (
            <Link key={set.id} href={`/sets/${set.id}?name=${encodeURIComponent(set.name)}`} passHref>
              <div style={{ border: "1px solid black", padding: "10px", textAlign: "center", cursor: "pointer" }}>
                <img src={set.images.logo} alt={set.name} width="100" />
                <p>{set.name}</p>
                <p>📅 {formatDate(set.releaseDate)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && sortOption !== "alphabetical" &&
        sortSeries(Object.keys(sets)).map((series) => (
          <div key={series} style={{ marginBottom: "20px" }}>
            <h2>{series}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              {sortAllSets(sets[series]).map((set) => (
                <Link key={set.id} href={`/sets/${set.id}?name=${encodeURIComponent(set.name)}`} passHref>
                  <div style={{ border: "1px solid black", padding: "10px", textAlign: "center", cursor: "pointer" }}>
                    <img src={set.images.logo} alt={set.name} width="100" />
                    <p>{set.name}</p>
                    <p>📅 {formatDate(set.releaseDate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
