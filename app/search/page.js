"use client";

import React, { Suspense, useEffect, useState } from "react";
import axios from "axios";
import supabase from "@/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function SearchPage() {
  return (
    <Suspense fallback={<p>⏳ Načítám vyhledávání...</p>}>
      <Search />
    </Suspense>
  );
}

function Search() {
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

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);

    try {
      const res = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm.trim()}"`);
      setCards(res.data.data || []);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Zadej jméno karty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleSearch}>🔍 Hledat</button>
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
                  <button>❌ Odebrat</button>
                </>
              ) : (
                <button>➕ Přidat</button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
