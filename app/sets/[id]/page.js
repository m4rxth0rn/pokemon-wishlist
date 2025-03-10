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
      setLoading(false);
    }
  };

  // 📌 Načítáme wishlist i karty při prvním načtení
  useEffect(() => {
    fetchWishlist();
    fetchCards();

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

  // 📌 Funkce pro konverzi čísla karty na číslo
  const parseCardNumber = (number) => {
    return parseInt(number.replace(/[^0-9]/g, ""), 10) || 0;
  };

  // 📌 Řazení karet v setu podle čísla
  const sortedCards = () => {
    return [...cards].sort((a, b) => parseCardNumber(a.number) - parseCardNumber(b.number));
  };

  // 📌 Přidání do wishlistu
  const handleAddToWishlist = async (card) => {
    await supabase.from("wishlist").insert([
      {
        id: card.id,
        name: card.name,
        image: card.images.small,
        number: `${card.number}/${card.set.printedTotal}`,
        set: card.set.name,
        releaseDate: card.set.releaseDate || "9999-12-31",
      },
    ]);
    fetchWishlist();
  };

  // 📌 Odebrání z wishlistu
  const handleRemoveFromWishlist = async (card) => {
    await supabase.from("wishlist").delete().eq("id", card.id);
    fetchWishlist();
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📦 Karty ze setu</h1>

      {loading && <p>⏳ Načítám...</p>}
      {!loading && cards.length === 0 && <p>😢 Žádné karty nenalezeny.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {!loading &&
          sortedCards().map((card) => (
            <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
              <img src={card.images.small} alt={card.name} width="150" />
              <p>{card.name}</p>
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
