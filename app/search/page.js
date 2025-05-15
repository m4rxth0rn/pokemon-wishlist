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
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data?.map((card) => card.id) || []));
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetchWishlist();

    const stored = localStorage.getItem("searchResults");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCards(parsed);
      } catch {}
    }

    const savedQuery = localStorage.getItem("searchQuery");
    if (savedQuery) setSearchTerm(savedQuery);

    const savedSort = localStorage.getItem("searchSort");
    if (savedSort) setSortOrder(savedSort);

    const subscription = supabase
      .channel("wishlist")
      .on("postgres_changes", { event: "*", schema: "public", table: "wishlist" }, fetchWishlist)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);

    try {
      const res = await axios.get(
        `https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm.trim()}"&include=tcgplayer`
      );
      const data = res.data.data || [];

      setCards(data);
      localStorage.setItem("searchResults", JSON.stringify(data));
      localStorage.setItem("searchQuery", searchTerm);
      localStorage.setItem("searchSort", sortOrder);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    }

    setLoading(false);
  };

  const handleAddToWishlist = async (card) => {
    const baseName = card.name?.split("|")[0].trim();
    const formattedName = `${baseName} | ${card.set.name} | ${card.number}/${card.set.printedTotal}`;

    try {
      await supabase.from("wishlist").upsert(
        [
          {
            id: card.id,
            name: formattedName,
            image: card.images.small,
            number: card.number,
            set: card.set.name,
            releaseDate: card.set.releaseDate || "9999-12-31",
          },
        ],
        { onConflict: "id" }
      );
      fetchWishlist();
    } catch (err) {
      console.error("Chyba při přidání karty:", err);
    }
  };

  const handleRemoveFromWishlist = async (cardId) => {
    try {
      await supabase.from("wishlist").delete().eq("id", cardId);
      fetchWishlist();
    } catch (err) {
      console.error("Chyba při odebírání karty:", err);
    }
  };

  const getCardPrice = (card) => {
    const prices = card.tcgplayer?.prices;
    if (!prices || Object.keys(prices).length === 0) return "Cena nedostupná";

    const priority = [
      "1stEditionHolofoil",
      "1stEdition",
      "holofoil",
      "reverseHolofoil",
      "normal",
      "unlimitedHolofoil",
      "unlimited",
    ];

    for (const type of priority) {
      if (prices[type]?.market) {
        return `${prices[type].market.toFixed(2)} $`;
      }
    }

    return "Cena nedostupná";
  };

  const parseReleaseDate = (card) =>
    card.set?.releaseDate ? new Date(card.set.releaseDate) : new Date("1999-01-09");

  const parseCardNumber = (number) => parseInt(number.replace(/[^0-9]/g, ""), 10) || 0;

  useEffect(() => {
    const queryParams = new URLSearchParams();
    if (searchTerm) queryParams.set("q", searchTerm);
    if (sortOrder) queryParams.set("sort", sortOrder);
    router.replace(`?${queryParams.toString()}`, { scroll: false });
  }, [searchTerm, sortOrder, router]);

  const sortedCards = [...cards].sort((a, b) => {
    const dateA = parseReleaseDate(a);
    const dateB = parseReleaseDate(b);
    if (dateA.getTime() !== dateB.getTime()) {
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    }
    return sortOrder === "newest"
      ? parseCardNumber(b.number) - parseCardNumber(a.number)
      : parseCardNumber(a.number) - parseCardNumber(b.number);
  });

  const handleCardClick = (cardId) => {
    const index = sortedCards.findIndex((card) => card.id === cardId);
    const ids = sortedCards.map((card) => card.id).join(",");
    const setId = sortedCards[index]?.set?.id || "unknown";

    const currentSearch = new URLSearchParams();
    if (searchTerm) currentSearch.set("q", searchTerm);
    if (sortOrder) currentSearch.set("sort", sortOrder);

    router.push(
      `/sets/${setId}/cards/${cardId}?from=search&ids=${ids}&index=${index}&${currentSearch.toString()}`
    );
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Zadej název karty..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch}>🔍 Hledat</button>
      </div>

      <div style={{ marginTop: "10px" }}>
        <label>Seřadit podle: </label>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="newest">🤚 Nejnovější → Nejstarší</option>
          <option value="oldest">📅 Nejstarší → Nejnovější</option>
        </select>
      </div>

      <h2>Výsledky:</h2>
      {loading && <p>⏳ Načítám...</p>}
      {!loading && sortedCards.length === 0 && <p>😥 Nic nebylo nalezeno.</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          justifyItems: "center",
          alignItems: "start",
          padding: "0 10px",
          width: "100%",
          maxWidth: isMobile ? "1000px" : "100%",
          margin: "0 auto",
        }}
      >
        {!loading &&
          sortedCards.map((card) => {
            const isInWishlist = wishlist.has(card.id);
            const isHovering = hoveredCardId === card.id;

            return (
              <div
                key={card.id}
                style={{
                  textAlign: "center",
                  transition: "transform 0.2s",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  padding: "8px",
                  width: "160px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "375px",
                }}
                onClick={() => handleCardClick(card.id)}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <div style={{ flexGrow: 1 }}>
                  <img
                    src={card.images.small}
                    alt={card.name}
                    width="150"
                    style={{ display: "block", margin: "0 auto 6px" }}
                  />
                  <p
                    style={{
                      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      fontWeight: "bold",
                      fontSize: isMobile ? "13px" : "15px",
                      margin: "4px 0 2px",
                      lineHeight: "1.2",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {card.name}
                  </p>
                  <div
                    style={{
                      fontSize: "13px",
                      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                      lineHeight: "1.3",
                      margin: "0 0 6px",
                      textAlign: "center",
                    }}
                  >
                    <div>{card.set.name}</div>
                    <div>{card.number}/{card.set.printedTotal}</div>
                  </div>
                  <p
                    style={{
                      minHeight: "24px",
                      textAlign: "center",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      marginBottom: "6px",
                    }}
                  >
                    💰 {getCardPrice(card)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    isInWishlist ? handleRemoveFromWishlist(card.id) : handleAddToWishlist(card);
                  }}
                  onMouseEnter={() => setHoveredCardId(card.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  style={{
                    width: "100%",
                    backgroundColor: isInWishlist
                      ? isHovering || isMobile
                        ? "#ff4444"
                        : "#e0ffe0"
                      : "#4CAF50",
                    color: isInWishlist
                      ? isHovering || isMobile
                        ? "#fff"
                        : "#000"
                      : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "all 0.2s ease-in-out",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    wordBreak: "break-word",
                    padding: "8px 6px",
                    minHeight: "42px",
                    marginTop: "auto",
                  }}
                >
                  {!isInWishlist
                    ? "➕ Přidat"
                    : isHovering || isMobile
                    ? "❌ Odebrat z wishlistu"
                    : "✅ Karta je na wishlistu"}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
