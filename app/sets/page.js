"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Link from "next/link";

export default function SetsPage() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("newest"); // Výchozí řazení: od nejnovějšího po nejstarší

  useEffect(() => {
    const fetchSets = async () => {
      try {
        const res = await axios.get("https://api.pokemontcg.io/v2/sets");

        // 📌 Uložíme všechny sety do objektu seskupeného podle série
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

  // 📌 Funkce pro zajištění, že všechny sety mají správné datum
  const parseReleaseDate = (set) => {
    return set.releaseDate ? new Date(set.releaseDate) : new Date("1999-01-09"); // ✅ Pokud není datum, dáme defaultně Base Set
  };

  // 📌 Funkce pro řazení všech setů
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

  // 📌 Funkce pro řazení sérií (pouze pokud není abecední řazení)
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

      {/* ✅ Pokud je vybrané abecední řazení, zobrazíme sety bez ohledu na éry */}
      {!loading && sortOption === "alphabetical" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {sortAllSets(Object.values(sets).flat()).map((set) => (
            <Link key={set.id} href={`/sets/${set.id}?name=${encodeURIComponent(set.name)}`} passHref>
              <div style={{ border: "1px solid black", padding: "10px", textAlign: "center", cursor: "pointer" }}>
                <img src={set.images.logo} alt={set.name} width="100" />
                <p>{set.name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ✅ Pokud není abecední řazení, zobrazíme sety seskupené podle série */}
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
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
