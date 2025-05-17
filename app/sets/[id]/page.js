"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import supabase from "@/supabase";
import styles from "./SetPage.module.css";

export default function SetPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const fetchWishlist = async (userId) => {
    const { data } = await supabase
      .from("wishlist")
      .select("card_id")
      .eq("user_id", userId);

    setWishlist(new Set(data.map((card) => card.card_id)));
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
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchWishlist(session.user.id);
      }
      await fetchCards();
    };

    fetchData();

    const subscription = supabase
      .channel("wishlist")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wishlist",
        },
        () => {
          if (user) fetchWishlist(user.id);
        }
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

  const parseCardNumber = (number) =>
    parseInt(number.replace(/[^0-9]/g, ""), 10) || 0;

  const sortedCards = () =>
    [...cards].sort((a, b) => parseCardNumber(a.number) - parseCardNumber(b.number));

  const handleAddToWishlist = async (card) => {
    if (!user || !user.id) {
      console.warn("⚠️ Uživatelská session není dostupná.");
      return;
    }

    const baseName = card.name?.split("|")[0].trim();
    const formattedName = `${baseName} | ${card.set.name} ${card.number}/${card.set.printedTotal}`;

    await supabase.from("wishlist").insert([
      {
        card_id: card.id,
        name: formattedName,
        image: card.images.small,
        number: card.number,
        set: card.set.name,
        releaseDate: card.set.releaseDate || "9999-12-31",
        user_id: user.id,
      },
    ]);

    await fetchWishlist(user.id);
  };

  const handleRemoveFromWishlist = async (card) => {
    if (!user) return;
    await supabase
      .from("wishlist")
      .delete()
      .eq("card_id", card.id)
      .eq("user_id", user.id);
    await fetchWishlist(user.id);
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
      const entry = prices[type];
      if (entry?.market) return `${entry.market.toFixed(2)} $`;
    }

    return "Cena nedostupná";
  };

  return (
    <div className={styles.pageBackground}>
      <h1>
        📦 {cards[0]?.set?.name}
        {cards[0]?.set?.images?.symbol && (
          <img
            src={cards[0].set.images.symbol}
            alt="Ikona setu"
            height={24}
            style={{ marginLeft: 8, verticalAlign: "middle" }}
          />
        )}
      </h1>

      {loading && <p>⏳ Načítám...</p>}
      {!loading && cards.length === 0 && <p>😥 Žádné karty nenalezeny.</p>}

      <div className={styles.grid}>
        {sortedCards().map((card) => (
          <div
            key={card.id}
            className={`${styles.card} ${styles.cardHover}`}
          >
            <Link href={`/sets/${id}/cards/${card.id}`} className={styles.link}>
              <img
                src={card.images.small}
                alt={card.name}
                width="150"
                className={styles.cardImage}
              />
              <p className={styles.cardName}>{card.name}</p>
              <p className={styles.cardInfo}>
                {card.set.name} {card.number}/{card.set.printedTotal}
              </p>
              <p className={styles.cardPrice}>💰 {getCardPrice(card)}</p>
            </Link>
                {user && (
  wishlist.has(card.id) ? (
    <button
      className={`${styles.buttonBase} ${styles.onWishlist}`}
      onClick={() => handleRemoveFromWishlist(card)}
      onMouseEnter={() => setHoveredCardId(card.id)}
      onMouseLeave={() => setHoveredCardId(null)}
    >
      {isMobile || hoveredCardId === card.id
        ? "❌ Odebrat"
        : "Karta je na wishlistu"}
    </button>
  ) : (
    <button
      className={`${styles.buttonBase} ${styles.add}`}
      onClick={() => handleAddToWishlist(card)}
    >
      ➕ Přidat
    </button>
  )
)}

          
          </div>
        ))}
      </div>
    </div>
  );
}