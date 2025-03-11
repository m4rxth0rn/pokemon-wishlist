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
  const [sortOrder, setSortOrder] = useState(searchParams.get("sort") || "newest");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());

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

  // 📌 Pomocná funkce pro datum vydání (pokud není, dá defaultní hodnotu)
  const parseReleaseDate = (card) => {
    return card.set?.releaseDate ? new Date(card.set.releaseDate) : new Date("1999-01-09"); // 📅 Default: Base Set datum
  };

  // 📌 Pomocná funkce pro číslo karty (řeší i promo karty)
  const parseCardNumber = (number) => {
    return parseInt(number.replace(/[^0-9]/g, ""), 10) || 0;
  };

  // 📌 Aktualizace URL při změně řazení
  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.set("q", searchTerm);
    if (sortOrder) queryParams.set("sort", sortOrder);

    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [searchTerm, sortOrder, router]);

  // 📌 Seřazení výsledků podle zvoleného řazení
  const sortedCards = [...cards].sort((a, b) => {
    const dateA = parseReleaseDate(a);
    const dateB = parseReleaseDate(b);

    if (dateA.getTime() !== dateB.getTime()) {
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB; // 📌 Nejnovější nebo nejstarší nahoře
    } else {
      return parseCardNumber(a.number) - parseCardNumber(b.number); // 📌 V rámci stejného setu řadíme podle čísla karty
    }
  });

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

      {/* 📌 Dropdown pro řazení */}
      <div style={{ marginTop: "10px" }}>
        <label>Seřadit podle: </label>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="newest">🆕 Nejnovější → Nejstarší</option>
          <option value="oldest">📅 Nejstarší → Nejnovější</option>
        </select>
      </div>

      <h2>Výsledky:</h2>
      {loading && <p>⏳ Načítám...</p>}
      {!loading && sortedCards.length === 0 && <p>😢 Nic nebylo nalezeno.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
        {!loading &&
          sortedCards.map((card) => (
            <div key={card.id} style={{ textAlign: "center" }}>
              <img src={card.images.small} alt={card.name} width="150" />
              <p>
                {card.name} | {card.set.name} {card.number}/{card.set.printedTotal || "?"}
              </p>

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
