"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/supabase";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // 📌 Uložený hledaný termín
  const [sortOption, setSortOption] = useState("newest");

  // 📌 Funkce pro načtení wishlistu
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("*");
    setWishlist(data || []);
  };

  useEffect(() => {
    fetchWishlist();

    // 📌 Obnovit hledaný termín z localStorage
    const savedSearchTerm = localStorage.getItem("wishlistSearchTerm");
    if (savedSearchTerm) {
      setSearchTerm(savedSearchTerm);
    }

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

  // 📌 Uložit hledaný termín do localStorage při změně
  const handleSearchChange = (e) => {
    const value = e.target.value.trimStart(); // Odstraní mezery na začátku
    setSearchTerm(value);
    localStorage.setItem("wishlistSearchTerm", value);
  };

  // 📌 Funkce pro filtrování wishlistu podle názvu
  const filteredWishlist = wishlist.filter((card) =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Pokémon Wishlist</h1>

      {/* 🔍 Vyhledávání */}
      <input
        type="text"
        placeholder="Hledat kartu..."
        value={searchTerm}
        onChange={handleSearchChange}
      />

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {filteredWishlist.length === 0 && <p>😢 Wishlist je prázdný.</p>}
        {filteredWishlist.map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.image} alt={card.name} width="150" />
            <p>{card.name}</p>
            <p>{card.set} | {card.number}</p>
            <button onClick={() => handleRemoveFromWishlist(card)}>
              ❌ Odebrat z wishlistu
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
