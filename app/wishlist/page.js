"use client";

import React, { useState, useEffect } from "react";
import supabase from "@/supabase";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📌 Načtení wishlistu
  useEffect(() => {
    const fetchWishlist = async () => {
      const { data, error } = await supabase.from("wishlist").select("*");
      if (error) {
        console.error("Chyba při načítání wishlistu:", error);
      } else {
        setWishlist(data);
      }
      setLoading(false);
    };

    fetchWishlist();
  }, []);

  // 📌 Funkce pro odebrání karty z wishlistu
  const handleRemoveFromWishlist = async (id) => {
    const { error } = await supabase.from("wishlist").delete().match({ id });

    if (error) {
      console.error("Chyba při odstraňování z wishlistu:", error);
    } else {
      setWishlist((prev) => prev.filter((card) => card.id !== id));
      alert("Karta byla odebrána z wishlistu.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Pokémon Wishlist</h1>
      {loading && <p>⏳ Načítám wishlist...</p>}
      {!loading && wishlist.length === 0 && <p>😢 Wishlist je prázdný.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {wishlist.map((card) => (
          <div key={card.id} style={{ border: "1px solid black", padding: "10px", textAlign: "center" }}>
            <img src={card.image} alt={card.name} width="100" />
            <p>{card.name}</p>
            <button onClick={() => handleRemoveFromWishlist(card.id)} style={{ backgroundColor: "red", color: "white" }}>
              ❌ Odebrat z wishlistu
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
