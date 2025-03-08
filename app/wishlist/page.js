"use client";

import React, { useEffect, useState } from "react";
import supabase from "@/supabase";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);

  // 📌 Načtení wishlistu
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("*");
    setWishlist(data || []);
  };

  useEffect(() => {
    fetchWishlist();

    // ✅ Realtime aktualizace wishlistu
    const subscription = supabase
      .channel("wishlist")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist" }, fetchWishlist)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 📌 Funkce pro odebrání karty z wishlistu
  const handleRemoveFromWishlist = async (card) => {
    const { error } = await supabase.from("wishlist").delete().eq("id", card.id);
    if (!error) fetchWishlist(); // ✅ Aktualizace po odstranění
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Pokémon Wishlist</h1>

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {wishlist.length === 0 && <p>😢 Wishlist je prázdný.</p>}
        {wishlist.map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.image} alt={card.name} width="150" />
            <p>{card.name}</p>
            <p>{card.set} | {card.number}</p>

            <button onClick={() => handleRemoveFromWishlist(card)}>❌ Odebrat z wishlistu</button>
          </div>
        ))}
      </div>
    </div>
  );
}
