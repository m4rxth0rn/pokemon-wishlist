"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/supabase";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [sortOption, setSortOption] = useState("newest"); // Výchozí řazení (nejnovější)
  
  // 📌 Funkce pro načtení wishlistu
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("*");
    setWishlist(data || []);
  };

  // 📌 Realtime aktualizace wishlistu
  useEffect(() => {
    fetchWishlist();

    const subscription = supabase
      .channel("wishlist")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist" },
        () => fetchWishlist() // ✅ Automatická aktualizace wishlistu
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 📌 Funkce pro získání data vydání setu
  const getReleaseDate = (setName) => {
    const setReleaseDates = {
      "Base Set": "1999-01-09",
      "Jungle": "1999-06-16",
      "Fossil": "1999-10-10",
      "Crown Zenith": "2023-01-20",
      "Evolving Skies": "2021-08-27",
      "Fusion Strike": "2021-11-12",
      "Black Star Promo": "9999-12-31", // Proma budou vždy na konci éry
    };
    return setReleaseDates[setName] || "9999-12-31"; // Pokud datum neexistuje, dáváme maximum
  };

  // 📌 Funkce pro řazení wishlistu
  const sortedWishlist = () => {
    let sortedList = [...wishlist];

    if (sortOption === "a-z") {
      sortedList.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sortOption === "newest") {
      sortedList.sort((a, b) => new Date(getReleaseDate(b.set)) - new Date(getReleaseDate(a.set)));
    }
    if (sortOption === "oldest") {
      sortedList.sort((a, b) => new Date(getReleaseDate(a.set)) - new Date(getReleaseDate(b.set)));
    }

    return sortedList;
  };

  // 📌 Funkce pro odebrání karty z wishlistu
  const handleRemoveFromWishlist = async (card) => {
    await supabase.from("wishlist").delete().eq("id", card.id);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Pokémon Wishlist</h1>

      {/* 🔹 Dropdown pro řazení */}
      <label>📌 Řadit podle:</label>
      <select onChange={(e) => setSortOption(e.target.value)} value={sortOption}>
        <option value="newest">Nejnovější → Nejstarší</option>
        <option value="oldest">Nejstarší → Nejnovější</option>
        <option value="a-z">Abecedně (A-Z)</option>
      </select>

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {wishlist.length === 0 && <p>😢 Wishlist je prázdný.</p>}
        {sortedWishlist().map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.image} alt={card.name} width="150" />
            <p>{card.name}</p>
            <p>{card.set} | {card.number}</p> {/* ✅ Formát setu a čísla */}
            
            <button onClick={() => handleRemoveFromWishlist(card)}>
              ❌ Odebrat z wishlistu
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
