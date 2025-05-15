"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import supabase from "@/supabase";

export default function SetPage() {
  const { id } = useParams();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data.map((card) => card.id)));
  };

  const fetchCards = async () => {
    try {
      const res = await axios.get(
        `https://api.pokemontcg.io/v2/cards?q=set.id:${id}&include=tcgplayer`
      );
      setCards(res.data.data || []);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
    fetchCards();

    const subscription = supabase
      .channel("wishlist")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist" },
        fetchWishlist
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const parseCardNumber = (number) => {
    return parseInt(number.replace(/[^0-9]/g, ""), 10) || 0;
  };

  const sortedCards = () => {
    return [...cards].sort(
      (a, b) => parseCardNumber(a.number) - parseCardNumber(b.number)
    );
  };

  const handleAddToWishlist = async (card) => {
    const baseName = card.name?.split("|")[0].trim();
    const formattedName = `${baseName} | ${card.set.name} ${card.number}/${card.set.printedTotal}`;

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
  };

  const handleRemoveFromWishlist = async (card) => {
    await supabase.from("wishlist").delete().eq("id", card.id);
    fetchWishlist();
  };

  const getCardPrice = (card) => {
    const prices = card.tcgplayer?.prices;
    if (!prices || Object.keys(prices).length === 0) {
      return "Cena nedostupná";
    }
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
      const entry = prices[type];
      if (entry && typeof entry.market === "number") {
        return `${entry.market.toFixed(2)} $`;
      }
    }
    return "Cena nedostupná";
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>
        📦 {cards[0]?.set?.name}
        {cards[0]?.set?.images?.symbol && (
          <img
            src={cards[0].set.images.symbol}
            alt="Ikona setu"
            style={{ height: 24, marginLeft: 8, verticalAlign: "middle" }}
          />
        )}
      </h1>

      {loading && <p>⏳ Načítám...</p>}
      {!loading && cards.length === 0 && <p>😥 Žádné karty nenalezeny.</p>}

      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "10px",
    justifyItems: "center",
    alignItems: "start",
    padding: "10px",
    width: "100%",
    maxWidth: isMobile ? "1000px" : "100%", // na mobilu zachová šířku, na PC rozšíří
    margin: "0 auto",
  }}
>

        {sortedCards().map((card) => (
          <div
            key={card.id}
            style={{
              margin: "10px",
              textAlign: "center",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.08)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.transform = "scale(1)")
            }
          >
            <Link
              href={`/sets/${id}/cards/${card.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <img
                src={card.images.small}
                alt={card.name}
                width="150"
                style={{ display: "block", margin: "0 auto 10px" }}
              />
              <p
                style={{
                  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  margin: "8px 0",
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: isMobile ? "13px" : "15px",
                  lineHeight: "1.2",
                  padding: "0 4px",
                  wordBreak: "break-word",
                }}
              >
                {card.name}
              </p>
              <p
                style={{
    fontSize: "13px",
    fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    textAlign: "center",
    margin: "4px 0",
  }}
>
  {card.set.name}  {card.number}/{card.set.printedTotal}
                
              </p>
              <p>💰 {getCardPrice(card)}</p>
            </Link>

            {wishlist.has(card.id) ? (
              <button
                onClick={() => handleRemoveFromWishlist(card)}
                onMouseEnter={() => setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  width: "140px",
                  backgroundColor:
                    isMobile || hoveredCardId === card.id
                      ? "#ff4444"
                      : "#e0ffe0",
                  color:
                    isMobile || hoveredCardId === card.id ? "#fff" : "#222",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s ease-in-out",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  minWidth: "140px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",




                }}
              >
                {isMobile || hoveredCardId === card.id
                  ? "❌ Odebrat"
                  : "Karta je na wishlistu"}
              </button>
            ) : (
              <button
                onClick={() => handleAddToWishlist(card)}
                style={{
                  width: "140px",
                  backgroundColor: "#4CAF50",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "all 0.2s ease-in-out",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  minWidth: "140px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
 



                }}
              >
                ➕ Přidat
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
