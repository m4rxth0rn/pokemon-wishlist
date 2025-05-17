// SearchPage.js
"use client";

import React, { useEffect, useState, Suspense } from "react";
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
  const [wishlist, setWishlist] = useState(new Set());
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredButtonId, setHoveredButtonId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const fetchSessionAndWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchWishlist(session.user.id);
      }
    };
    fetchSessionAndWishlist();

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
  }, []);

  const fetchWishlist = async (userId) => {
     const { data } = await supabase.from("wishlist").select("card_id").eq("user_id", userId);
+ setWishlist(new Set(data?.map((card) => card.card_id) || []));
  };
const handleRemoveFromWishlist = async (cardId) => {
  if (!user) return;
  await supabase
    .from("wishlist")
    .delete()
    .eq("card_id", cardId)
    .eq("user_id", user.id);

  await fetchWishlist(user.id);
};

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm.trim()}"&include=tcgplayer`);
      const results = res.data.data || [];
      setCards(results);
      localStorage.setItem("searchResults", JSON.stringify(results));
      localStorage.setItem("searchQuery", searchTerm);
      localStorage.setItem("searchSort", sortOrder);
    } catch (error) {
      console.error("Chyba při vyhledávání:", error);
    }
    setLoading(false);
  };

  const handleAddToWishlist = async (card) => {
  if (!user) return;

  const exists = wishlist.has(card.id);
  if (exists) return;

  console.log("📥 Pokus o přidání karty:", card.id, "uživatelem:", user.id);

  const baseName = card.name?.split("|")[0].trim();
  const formattedName = `${baseName} | ${card.set.name} | ${card.number}/${card.set.printedTotal}`;

  const { error } = await supabase.from("wishlist").insert([{
    card_id: card.id,
    name: formattedName,
    image: card.images.small,
    number: card.number,
    set: card.set.name,
    releaseDate: card.set.releaseDate || "9999-12-31",
    user_id: user.id,
  }]);

  if (error) {
    console.error("❌ Chyba při přidávání do wishlistu:", error.message);
  } else {
    console.log("✅ Karta úspěšně přidána:", card.id);
    await fetchWishlist(user.id);
  }
};


  const getCardPrice = (card) => {
    const prices = card.tcgplayer?.prices;
    if (!prices) return "Cena nedostupná";
    const type = Object.keys(prices).find((t) => prices[t].market);
    return type ? `${prices[type].market.toFixed(2)} $` : "Cena nedostupná";
  };

  const sortedCards = [...cards].sort((a, b) => {
    const dateA = new Date(a.set.releaseDate);
    const dateB = new Date(b.set.releaseDate);
    if (dateA.getTime() !== dateB.getTime()) {
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    }
    return sortOrder === "newest"
      ? parseInt(b.number.replace(/\D/g, "")) - parseInt(a.number.replace(/\D/g, ""))
      : parseInt(a.number.replace(/\D/g, "")) - parseInt(b.number.replace(/\D/g, ""));
  });

  const handleCardClick = (cardId) => {
    const index = sortedCards.findIndex((c) => c.id === cardId);
    const ids = sortedCards.map((c) => c.id).join(",");
    const setId = sortedCards[index]?.set?.id || "unknown";
    router.push(`/sets/${setId}/cards/${cardId}?from=search&ids=${ids}&index=${index}`);
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

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "12px",
        justifyItems: "center",
        padding: "10px 0"
      }}>
        {sortedCards.map((card) => {
          const isInWishlist = wishlist.has(card.id);
          const isHoveringCard = hoveredCardId === card.id;
          const isHoveringButton = hoveredButtonId === card.id;

          return (
            <div
              key={card.id}
              style={{
                textAlign: "center",
                transition: "transform 0.3s ease",
                transform: isHoveringCard ? "scale(1.07)" : "scale(1)",
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
              onMouseEnter={() => setHoveredCardId(card.id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              <img
                src={card.images.small}
                alt={card.name}
                style={{
                  width: "150px",
                  marginBottom: "8px",
                  transition: "transform 0.3s ease"
                }}
              />
              <p style={{ fontWeight: "bold", fontSize: isMobile ? "13px" : "15px" }}>{card.name}</p>
              <p style={{ fontSize: "13px", fontFamily: '"Segoe UI", Roboto, sans-serif' }}>{card.set.name} {card.number}/{card.set.printedTotal}</p>
              <p style={{ minHeight: "24px" }}>💰 {getCardPrice(card)}</p>

              {user && (
                <button
                  onMouseEnter={() => setHoveredButtonId(card.id)}
                  onMouseLeave={() => setHoveredButtonId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    isInWishlist
                      ? handleRemoveFromWishlist(card.id)
                      : handleAddToWishlist(card);
                  }}
                  style={{
                    marginTop: "auto",
                    backgroundColor: isInWishlist
                      ? isHoveringButton || isMobile ? "#ff4444" : "#e0ffe0"
                      : "#4CAF50",
                    color: isInWishlist
                      ? isHoveringButton || isMobile ? "#fff" : "#000"
                      : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    padding: "8px 6px",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out"
                  }}
                >
                  {!isInWishlist
                    ? "➕ Přidat"
                    : isHoveringButton || isMobile
                    ? "❌ Odebrat z wishlistu"
                    : "Karta je na wishlistu"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
