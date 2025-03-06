"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import supabase from "@/supabase";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cards, setCards] = useState([]);
  const [wishlist, setWishlist] = useState(new Map());
  const [loading, setLoading] = useState(false);

  // 📌 Načítání wishlistu při spuštění
  useEffect(() => {
    const fetchWishlist = async () => {
      const { data, error } = await supabase.from("wishlist").select("id, name");
      if (!error && data) {
        const wishlistMap = new Map(data.map((card) => [card.id, card.name]));
        setWishlist(wishlistMap);
      }
    };
    fetchWishlist();
  }, []);

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

  // 📌 Přidání do wishlistu (stejné jako v setech)
  const handleAddToWishlist = async (card) => {
    const { error } = await supabase.from("wishlist").insert([
      { id: card.id, name: card.name, image: card.images.small },
    ]);

    if (error) {
      console.error("Chyba při přidání do wishlistu:", error);
    } else {
      setWishlist((prev) => new Map(prev).set(card.id, card.name));
    }
  };

  // 📌 Odebrání z wishlistu (stejné jako v setech)
  const handleRemoveFromWishlist = async (card) => {
    const { error } = await supabase.from("wishlist").delete().match({ id: card.id });

    if (error) {
      console.error("Chyba při odebírání z wishlistu:", error);
    } else {
      setWishlist((prev) => {
        const newWishlist = new Map(prev);
        newWishlist.delete(card.id);
        return newWishlist;
      });
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <input
        type="text"
        placeholder="Zadej jméno karty..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? "Hledám..." : "Hledat"}
      </button>

      <h2>Výsledky:</h2>
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {cards.length === 0 && !loading && <p>😢 Nic nebylo nalezeno.</p>}
        {cards.map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.images.small} alt={card.name} width="150" />
            <p>{card.name}</p>
            {wishlist.has(card.id) ? (
              <>
                <button
                  style={{ backgroundColor: "red", color: "white", padding: "5px", border: "none", cursor: "pointer" }}
                  onClick={() => handleRemoveFromWishlist(card)}
                >
                  ❌ Odebrat z wishlistu
                </button>
                <p style={{ color: "green", fontSize: "14px", marginTop: "5px" }}>
                  ✅ Karta je na wishlistu
                </p>
              </>
            ) : (
              <button
                style={{ backgroundColor: "green", color: "white", padding: "5px", border: "none", cursor: "pointer" }}
                onClick={() => handleAddToWishlist(card)}
              >
                ➕ Přidat do wishlistu
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
