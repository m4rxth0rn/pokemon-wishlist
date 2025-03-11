"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import supabase from "@/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function Search() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());
  const [sortOrder, setSortOrder] = useState(searchParams.get("sort") || "Desc");

  useEffect(() => {
    fetchWishlist();
    const subscription = supabase
      .channel("wishlist")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist" }, fetchWishlist)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data?.map((card) => card.id) || []));
  };

  const updateSearchParams = (key, value) => {
    const newParams = new URLSearchParams(window.location.search);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    router.replace(`?${newParams.toString()}`);
  };

  const normalizeText = (text) => text.toLowerCase().replace(/\s+/g, "");

  const sortCardsByReleaseDate = (cards, order) => {
    return [...cards].sort((a, b) => {
      const dateA = a.set.releaseDate ? new Date(a.set.releaseDate) : new Date(0);
      const dateB = b.set.releaseDate ? new Date(b.set.releaseDate) : new Date(0);
      if (dateA - dateB === 0) {
        return parseInt(a.number) - parseInt(b.number);
      }
      return order === "Asc" ? dateA - dateB : dateB - dateA;
    });
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    updateSearchParams("q", searchTerm.trim());

    try {
      const res = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm.trim()}"`);
      const sortedCards = sortCardsByReleaseDate(res.data.data || [], sortOrder);
      setCards(sortedCards);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    }
  }, [sortOrder]);

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="text"
          placeholder="Zadej jméno karty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" || e.keyCode === 13) && handleSearch()} // ✅ Opravené pro mobilní prohlížeče
        />

        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value);
            updateSearchParams("sort", e.target.value);
          }}
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