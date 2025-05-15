"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function SetsPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest");
  const router = useRouter();

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get("https://api.pokemontcg.io/v2/sets");
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

  const parseReleaseDate = (set) =>
    set.releaseDate ? new Date(set.releaseDate) : new Date("1999-01-09");

  const sortAllSets = (setsArray) => {
    if (sortOption === "alphabetical") {
      return setsArray.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "newest") {
      return setsArray.sort((a, b) => parseReleaseDate(b) - parseReleaseDate(a));
    } else if (sortOption === "oldest") {
      return setsArray.sort((a, b) => parseReleaseDate(a) - parseReleaseDate(b));
    }
    return setsArray;
  };

  const sortSeries = (seriesArray) => {
    if (sortOption === "newest") {
      return seriesArray.sort((a, b) => {
        const latestA = Math.max(...sets[a].map(s => parseReleaseDate(s)));
        const latestB = Math.max(...sets[b].map(s => parseReleaseDate(s)));
        return latestB - latestA;
      });
    } else if (sortOption === "oldest") {
      return seriesArray.sort((a, b) => {
        const latestA = Math.max(...sets[a].map(s => parseReleaseDate(s)));
        const latestB = Math.max(...sets[b].map(s => parseReleaseDate(s)));
        return latestA - latestB;
      });
    }
    return seriesArray;
  };

  const cardStyle = {
    width: "140px",
    height: "180px",
    border: "1px solid #ddd",
    padding: "10px",
    textAlign: "center",
    cursor: "pointer",
    borderRadius: "8px",
    transition: "transform 0.2s ease-in-out, box-shadow 0.2s",
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
  };

  const containerStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    justifyContent: "flex-start",
  };

  const handleHover = (e) => {
    e.currentTarget.style.transform = "scale(1.08)";
    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
  };

  const handleLeave = (e) => {
    e.currentTarget.style.transform = "scale(1)";
    e.currentTarget.style.boxShadow = "none";
  };

  const goToSet = (id, name) => {
    router.push(`/sets/${id}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📦 Pokémon Sety</h1>

      <label>Seřadit podle: </label>
      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        style={{ marginBottom: "20px" }}
      >
        <option value="newest">🆕 Od nejnovějších po nejstarší</option>
        <option value="oldest">📅 Od nejstarších po nejnovější</option>
        <option value="alphabetical">🔤 Abecedně (A-Z)</option>
      </select>

      {loading && <p>⏳ Načítám sety...</p>}

      {!loading && sortOption === "alphabetical" && (
        <div style={containerStyle}>
          {sortAllSets(Object.values(sets).flat()).map((set) => (
            <div
              key={set.id}
              style={cardStyle}
              onMouseEnter={handleHover}
              onMouseLeave={handleLeave}
              onTouchStart={handleHover}
              onTouchEnd={handleLeave}
              onClick={() => goToSet(set.id, set.name)}
            >
              <img src={set.images.logo} alt={set.name} style={{ maxWidth: "100%", height: "50px", objectFit: "contain" }} />
              <p style={{ fontWeight: "bold", fontSize: "14px", margin: "6px 0 4px" }}>{set.name}</p>
              <img src={set.images.symbol} alt="symbol" width="30" />
            </div>
          ))}
        </div>
      )}

      {!loading && sortOption !== "alphabetical" &&
        sortSeries(Object.keys(sets)).map((series) => (
          <div key={series} style={{ marginBottom: "30px" }}>
            <h2>{series}</h2>
            <div style={containerStyle}>
              {sortAllSets(sets[series]).map((set) => (
                <div
                  key={set.id}
                  style={cardStyle}
                  onMouseEnter={handleHover}
                  onMouseLeave={handleLeave}
                  onTouchStart={handleHover}
                  onTouchEnd={handleLeave}
                  onClick={() => goToSet(set.id, set.name)}
                >
                  <img src={set.images.logo} alt={set.name} style={{ maxWidth: "100%", height: "50px", objectFit: "contain" }} />
                  <p style={{ fontWeight: "bold", fontSize: "14px", margin: "6px 0 4px" }}>{set.name}</p>
                  <img src={set.images.symbol} alt="symbol" width="30" />
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
