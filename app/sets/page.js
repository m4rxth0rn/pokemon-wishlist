"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import styles from "./SetsPage.module.css";

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

  const goToSet = (id, name) => {
    router.push(`/sets/${id}?name=${encodeURIComponent(name)}`);
  };

  return (
    <div className={styles.pageBackground}>

      <h1 className={styles.title}>📦 Pokémon Sety</h1>

      <div className={styles.sortBar}>
        <label>Seřadit podle: </label>
        <select
  className={styles.selectDropdown}
  value={sortOption}
  onChange={(e) => setSortOption(e.target.value)}
>
  <option value="newest">🆕 Od nejnovějších po nejstarší</option>
  <option value="oldest">📅 Od nejstarších po nejnovější</option>
  <option value="alphabetical">🔤 Abecedně (A-Z)</option>
</select>

          
      </div>

      {loading && <p>⏳ Načítám sety...</p>}

      {!loading && sortOption === "alphabetical" && (
        <div className={styles.grid}>
          {sortAllSets(Object.values(sets).flat()).map((set) => (
            <div
              key={set.id}
              className={styles.card}
              onClick={() => goToSet(set.id, set.name)}
            >
              <img src={set.images.logo} alt={set.name} className={styles.logo} />
              <p className={styles.cardName}>{set.name}</p>
              <img src={set.images.symbol} alt="symbol" className={styles.symbol} />
            </div>
          ))}
        </div>
      )}

      {!loading && sortOption !== "alphabetical" &&
        sortSeries(Object.keys(sets)).map((series) => (
          <div key={series} className={styles.seriesBlock}>
            <h2 className={styles.seriesTitle}>{series}</h2>
            <div className={styles.grid}>
              {sortAllSets(sets[series]).map((set) => (
                <div
                  key={set.id}
                  className={styles.card}
                  onClick={() => goToSet(set.id, set.name)}
                >
                  <img src={set.images.logo} alt={set.name} className={styles.logo} />
                  <p className={styles.cardName}>{set.name}</p>
                  <img src={set.images.symbol} alt="symbol" className={styles.symbol} />
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
