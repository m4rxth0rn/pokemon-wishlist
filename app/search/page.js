"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import supabase from "@/supabase";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());
  const [sortOrder, setSortOrder] = useState("Desc");

  // 📌 Načtení wishlistu
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data?.map((card) => card.id) || []));
  };

  useEffect(() => {
    fetchWishlist();
    const subscription = supabase
      .channel("wishlist")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist" },
        () => fetchWishlist()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 📌 Funkce pro konverzi data na správný formát
  const parseReleaseDate = (dateString) => {
    return dateString ? new Date(dateString) : new Date(0);
  };

  // 📌 Řazení karet podle data vydání setu
  const sortCardsByReleaseDate = (cards, order) => {
    return [...cards].sort((a, b) => {
      const dateA = parseReleaseDate(a.set.releaseDate);
      const dateB = parseReleaseDate(b.set.releaseDate);
      return order === "Asc" ? dateA - dateB : dateB - dateA;
    });
  };

  // 📌 Hledání karet
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);

    try {
      const res = await axios.get(
        `https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm}"`
      );
      const sortedCards = sortCardsByReleaseDate(res.data.data || [], sortOrder);
      setCards(sortedCards);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    }

    setLoading(false);
  };

  // 📌 Automatické hledání při změně řazení
  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    }
  }, [sortOrder]);

  // 📌 Přidání karty do wishlistu
  const handleAddToWishlist = async (card) => {
    const { error } = await supabase.from("wishlist").insert([
      {
        id: card.id,
        name: card.name,
        image: card.images.small,
        number: `${card.number}/${card.set.printedTotal}`,
        set: card.set.name,
      },
    ]);

    if (!error) {
      fetchWishlist(); // ✅ Aktualizace wishlistu
    }
  };

  // 📌 Odebrání karty z wishlistu
  const handleRemoveFromWishlist = async (card) => {
    await supabase.from("wishlist").delete().eq("id", card.id);
    fetchWishlist(); // ✅ Aktualizace wishlistu
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="text"
          placeholder="Zadej jméno karty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="Desc">🔽 Nejnovější první</option>
          <option value="Asc">🔼 Nejstarší první</option>
        </select>
      </div>

      <h2>Výsledky:</h2>
      {loading && <p>⏳ Načítám...</p>}
      {!loading && cards.length === 0 && <p>😢 Nic nebylo nalezeno.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
        {!loading &&
          cards.map((card) => (
            <div key={card.id} style={{ textAlign: "center" }}>
              <img src={card.images.small} alt={card.name} width="150" />
              <p>{card.set.name} | {card.number}/{card.set.printedTotal}</p>

              {wishlist.has(card.id) ? (
                <>
                  <p>✅ Karta je na wishlistu</p>
                  <button onClick={() => handleRemoveFromWishlist(card)}>❌ Odebrat</button>
                </>
              ) : (
                <button onClick={() => handleAddToWishlist(card)}>➕ Přidat</button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
