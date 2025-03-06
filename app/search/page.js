"use client";

import React, { useState } from "react";
import axios from "axios";
import supabase from "@/supabase";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());

  // 📌 Načíst wishlist z databáze
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data.map((card) => card.id)));
  };

  // 📌 Hledání karet
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

  // 📌 Přidání do wishlistu
  const handleAddToWishlist = async (card) => {
    const { error } = await supabase.from("wishlist").insert([
      {
        id: card.id,
        name: card.name,
        image: card.images.small,
        number: `${card.number}/${card.set.printedTotal}`, // Upravíme formát
        set: card.set.name,
      },
    ]);

    if (!error) {
      setWishlist(new Set([...wishlist, card.id]));
    }
  };

  // 📌 Odebrání z wishlistu
  const handleRemoveFromWishlist = async (card) => {
    await supabase.from("wishlist").delete().eq("id", card.id);
    const newWishlist = new Set(wishlist);
    newWishlist.delete(card.id);
    setWishlist(newWishlist);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <input
        type="text"
        placeholder="Zadej jméno karty..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSearch()} // Hledání stisknutím Enter
      />

      <h2>Výsledky:</h2>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {cards.length === 0 && !loading && <p>😢 Nic nebylo nalezeno.</p>}
        {cards.map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.images.small} alt={card.name} width="150" />
            <p>{card.name}</p>
            <p>{card.set.name} | {card.number}/{card.set.printedTotal}</p> {/* Upravené zobrazení */}
            {wishlist.has(card.id) ? (
              <>
                <button onClick={() => handleRemoveFromWishlist(card)}>❌ Odebrat z wishlistu</button>
                <p>✅ Karta je na wishlistu</p>
              </>
            ) : (
              <button onClick={() => handleAddToWishlist(card)}>➕ Přidat do wishlistu</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
