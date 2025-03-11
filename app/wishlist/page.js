"use client";

import React, { useEffect, useState, Suspense } from "react";
import supabase from "@/supabase";
import { useSearchParams, useRouter } from "next/navigation";

function WishlistContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 📌 Načíst parametry z URL při prvním renderu
  const initialSearchTerm = searchParams.get("q") || "";
  const initialSortOrder = searchParams.get("sort") || "newest";

  const [wishlist, setWishlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  useEffect(() => {
    fetchWishlist();
    const subscription = supabase
      .channel("wishlist")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist" },
        fetchWishlist
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("*");
    setWishlist(data || []);
  };

  // 📌 Pomocná funkce pro datum vydání (pokud není, dá defaultní hodnotu)
  const parseReleaseDate = (card) => {
    return card.releaseDate ? new Date(card.releaseDate) : new Date("1999-01-09"); // 📅 Default: Base Set datum
  };

  // 📌 Pomocná funkce pro číslo karty (řeší i promo karty)
  const parseCardNumber = (number) => {
    return parseInt(number.replace(/[^0-9]/g, ""), 10) || 0;
  };

  // 📌 Aktualizace URL při změně hledaného textu nebo řazení
  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.set("q", searchTerm);
    if (sortOrder) queryParams.set("sort", sortOrder);

    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [searchTerm, sortOrder, router]);

  // 📌 Seřazený wishlist podle zvoleného řazení
  const sortedWishlist = [...wishlist]
    .filter((card) => {
      const search = searchTerm.trim().toLowerCase();
      return search === "" || card.name.toLowerCase().startsWith(search);
    })
    .sort((a, b) => {
      const dateA = parseReleaseDate(a);
      const dateB = parseReleaseDate(b);

      if (dateA.getTime() !== dateB.getTime()) {
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      } else {
        return parseCardNumber(a.number) - parseCardNumber(b.number);
      }
    });

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Pokémon Wishlist</h1>

      {/* 📌 Vyhledávání, které se uchová i po refreshi */}
      <input
        type="text"
        placeholder="Hledat Pokémony..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div style={{ marginTop: "10px" }}>
        <label>Seřadit podle: </label>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="newest">🆕 Nejnovější → Nejstarší</option>
          <option value="oldest">📅 Nejstarší → Nejnovější</option>
        </select>
      </div>

      {sortedWishlist.length === 0 ? (
        <p>😢 Wishlist je prázdný.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
          {sortedWishlist.map((card) => (
            <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
              <img src={card.image} alt={card.name} width="150" />
              <p>
                {card.name} | {card.set} {card.number}
              </p>
              <button>❌ Odebrat</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<p>Načítám wishlist...</p>}>
      <WishlistContent />
    </Suspense>
  );
}
