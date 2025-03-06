"use client";

import React, { useState } from "react";
import axios from "axios";
import supabase from "@/supabase";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📌 Funkce pro hledání karet
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);

    try {
      const res = await axios.get(
        `https://api.pokemontcg.io/v2/cards?q=name:${searchTerm}`
      );
      setCards(res.data.data || []);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    }

    setLoading(false);
  };

  // 📌 Funkce na ENTER pro spuštění hledání
  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      {/* 📌 Odebrali jsme tlačítko a hledáme ENTERem */}
      <input
        type="text"
        placeholder="Zadej jméno karty..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyPress} // 📌 Spustí hledání po stisknutí ENTER
      />

      <h2>Výsledky:</h2>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {cards.length === 0 && !loading && <p>😢 Nic nebylo nalezeno.</p>}
        {cards.map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.images.small} alt={card.name} width="150" />
            <p>{card.name}</p>
            <button onClick={() => handleAddToWishlist(card)}>
              Přidat do wishlistu
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
