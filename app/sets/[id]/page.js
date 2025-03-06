"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import supabase from "@/supabase";

export default function SetPage() {
  const { id } = useParams();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());

  // 📌 Načteme wishlist pro kontrolu, které karty jsou už přidané
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data.map((card) => card.id)));
  };

  // 📌 Načteme karty setu
  const fetchCards = async () => {
    try {
      const res = await axios.get(`https://api.pokemontcg.io/v2/cards?q=set.id:${id}`);
      setCards(res.data.data || []);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    } finally {
      setLoading(false); // ✅ Načítání dokončeno
    }
  };

  // 📌 Načítáme wishlist i karty při prvním načtení a přidáváme realtime listener
  useEffect(() => {
    fetchWishlist();
    fetchCards();

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

  // 📌 Přidání do wishlistu
  const handleAddToWishlist = async (card) => {
    await supabase.from("wishlist").insert([
      {
        id: card.id,
        name: card.name,
        image: card.images.small,
        number: `${card.number}/${card.set.printedTotal}`,
        set: card.set.name,
      },
    ]);
    fetchWishlist(); // ✅ Aktualizace wishlistu
  };

  // 📌 Odebrání z wishlistu
  const handleRemoveFromWishlist = async (card) => {
    await supabase.from("wishlist").delete().eq("id", card.id);
    fetchWishlist(); // ✅ Aktualizace wishlistu
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📦 Karty ze setu</h1>

      {/* ✅ Načítání - zobrazí se jen pokud se data stále načítají */}
      {loading && <p>⏳ Načítám...</p>}

      {/* ✅ Zobrazení karet, pokud jsou načtené */}
      {!loading && cards.length === 0 && <p>😢 Žádné karty nenalezeny.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {!loading &&
          cards.map((card) => (
            <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
              <img src={card.images.small} alt={card.name} width="150" />
              <p>{card.name}</p>
              <p>
                {card.set.name} | {card.number}/{card.set.printedTotal}
              </p>{" "}
              {/* ✅ Správný formát */}

              {wishlist.has(card.id) ? (
                <>
                  <p>✅ Karta je na wishlistu</p>
                  <button onClick={() => handleRemoveFromWishlist(card)}>❌ Odebrat z wishlistu</button>
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
