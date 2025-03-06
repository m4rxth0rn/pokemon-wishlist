"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useParams } from "next/navigation";
import axios from "axios";
import supabase from "@/supabase";

export default function SetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id;
  const setName = searchParams.get("name") || "Neznámý set";

  const [cards, setCards] = useState([]);
  const [wishlist, setWishlist] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // 📌 Načtení wishlistu
  useEffect(() => {
    const fetchWishlist = async () => {
      const { data, error } = await supabase.from("wishlist").select("id");
      if (error) {
        console.error("Chyba při načítání wishlistu:", error);
      } else {
        setWishlist(new Set(data.map((item) => item.id)));
      }
    };

    fetchWishlist();
  }, []);

  // 📌 Načtení karet z daného setu
  useEffect(() => {
    if (!id) return;

    const fetchCards = async () => {
      try {
        const res = await axios.get(`https://api.pokemontcg.io/v2/cards?q=set.id:${id}`);
        const sortedCards = res.data.data.sort((a, b) => parseInt(a.number) - parseInt(b.number));
        setCards(sortedCards);
      } catch (error) {
        console.error("Chyba při načítání karet:", error);
      }
      setLoading(false);
    };

    fetchCards();
  }, [id]);

  // 📌 Přidání do wishlistu
  const handleAddToWishlist = async (card) => {
    const { error } = await supabase.from("wishlist").insert([
      { id: card.id, name: card.name, image: card.images.small },
    ]);

    if (error) {
      console.error("Chyba při přidání do wishlistu:", error);
    } else {
      setWishlist(new Set([...wishlist, card.id]));
    }
  };

  // 📌 Odebrání z wishlistu
  const handleRemoveFromWishlist = async (cardId) => {
    const { error } = await supabase.from("wishlist").delete().eq("id", cardId);

    if (error) {
      console.error("Chyba při odebrání z wishlistu:", error);
    } else {
      const updatedWishlist = new Set(wishlist);
      updatedWishlist.delete(cardId);
      setWishlist(updatedWishlist);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📦 Set: {setName}</h1> 

      {loading && <p>⏳ Načítám karty...</p>}

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {!loading && cards.length === 0 && <p>😢 Žádné karty nebyly nalezeny.</p>}

        {cards.map((card) => (
          <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
            <img src={card.images.small} alt={card.name} width="150" />
            <p>{card.name}</p>
            {wishlist.has(card.id) ? (
              <>
                <p>✅ Na wishlistu</p>
                <button onClick={() => handleRemoveFromWishlist(card.id)}>Odebrat</button>
              </>
            ) : (
              <button onClick={() => handleAddToWishlist(card)}>Přidat do wishlistu</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
