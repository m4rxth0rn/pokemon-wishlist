"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import supabase from "@/supabase";
import styles from "./CardDetailPage.module.css";

export default function CardDetailPage() {
  const { id: setId, cardId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const fromWishlist = searchParams.get("from") === "wishlist";
  const fromSearch = searchParams.get("from") === "search";
  const idList = searchParams.get("ids")?.split(",") || [];
  const initialIndex = parseInt(searchParams.get("index"), 10) || 0;

  const [allCards, setAllCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(new Set());
  const [user, setUser] = useState(null);
  const [hoverRemove, setHoverRemove] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const modalRef = useRef();
  const [copied, setCopied] = useState(false);

  const fetchWishlist = async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase.from("wishlist").select("card_id").eq("user_id", userId);
    if (!error) setWishlist(new Set(data.map((c) => c.card_id)));
  };

  const fetchCard = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`https://api.pokemontcg.io/v2/cards/${id}?include=tcgplayer`);
      setCard(res.data.data);
    } catch (error) {
      console.error("Chyba při načítání detailu karty:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async () => {
    if (!user || !card || !card.images?.small) return;
    const wishlistItem = {
      card_id: String(card.id),
      name: `${card.name?.split("|")[0].trim()} | ${card.set.name} ${card.number}/${card.set.printedTotal}`,
      image: String(card.images.small),
      number: String(card.number),
      set: String(card.set.name),
      releaseDate: String(card.set.releaseDate || "9999-12-31"),
      user_id: user.id,
    };
    const { error } = await supabase.from("wishlist").insert([wishlistItem]);
    if (!error) await fetchWishlist(user.id);
  };

  const removeFromWishlist = async () => {
    if (!user || !card?.id) return;
    await supabase.from("wishlist").delete().eq("card_id", card.id).eq("user_id", user.id);
    await fetchWishlist(user.id);
  };

  useEffect(() => {
    const fetchUserAndWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchWishlist(session.user.id);
      }
    };
    fetchUserAndWishlist();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleEscape = (e) => e.key === "Escape" && setModalOpen(false);
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) setModalOpen(false);
    };
    if (modalOpen && !isMobile) {
      window.addEventListener("keydown", handleEscape);
      window.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [modalOpen, isMobile]);

  useEffect(() => {
    async function fetchData() {
      try {
        if (fromSearch) {
          await fetchCard(cardId);
        } else if (fromWishlist && idList.length > 0) {
          const cards = [];
          const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
          for (const id of idList) {
            const res = await axios.get(`https://api.pokemontcg.io/v2/cards/${id}`);
            cards.push(res.data.data);
            await delay(200);
          }
          setAllCards(cards);
          setCurrentIndex(initialIndex);
          await fetchCard(cards[initialIndex]?.id);
        } else {
          const res = await axios.get(`https://api.pokemontcg.io/v2/cards/${cardId}?include=tcgplayer`);
          setCard(res.data.data);
          const setCardsRes = await axios.get(`https://api.pokemontcg.io/v2/cards?q=set.id:%22${setId}%22&orderBy=number`);
          const cards = setCardsRes.data.data;
          setAllCards(cards);
          const idx = cards.findIndex((c) => c.id === cardId);
          setCurrentIndex(idx);
        }
      } catch (error) {
        console.error("Chyba při načítání:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [setId, cardId]);

  if (loading) return <p>⏳ Načítám...</p>;
  if (!card) return <p>😢 Karta nenalezena.</p>;

  const { name, images, hp, types, evolvesFrom, flavorText, rarity, attacks, weaknesses, resistances, retreatCost, tcgplayer, set } = card;
  const btnInWishlist = wishlist.has(card.id);

  return (
    <div className={styles.pageBackground}>
      <div className={styles.topButtons}>
        <button onClick={() => router.back()} className={styles.backButton}>🔙 Zpět</button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={styles.shareButton}
        >
          {copied ? "📋 Odkaz zkopírován" : "📋 Sdílet"}
        </button>
        {user && (
          <button
            onClick={() => (btnInWishlist ? removeFromWishlist() : addToWishlist())}
            onMouseEnter={() => { if (!isMobile) setHoverRemove(true); }}
            onMouseLeave={() => { if (!isMobile) setHoverRemove(false); }}
            className={`${styles.wishlistButton} ${btnInWishlist ? (hoverRemove || isMobile ? styles.remove : styles.added) : ""}`}
          >
            {!btnInWishlist
              ? "➕ Přidat do wishlistu"
              : isMobile
              ? "❌ Odebrat z wishlistu"
              : hoverRemove
              ? "❌ Odebrat z wishlistu"
              : "Karta je na wishlistu"}
          </button>
        )}
      </div>

      <h1>{name} {rarity}</h1>
      <img
        src={images.large}
        alt={name}
        className={styles.cardImage}
        onClick={() => setModalOpen(true)}
      />

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} ref={modalRef}>
            <img src={images.large} alt={name} className={styles.modalImage} />
            {isMobile && (
              <button onClick={() => setModalOpen(false)} className={styles.modalCloseButton}>Zavřít</button>
            )}
          </div>
        </div>
      )}

      <p><strong>HP:</strong> {hp || "-"}</p>
      <p><strong>Typy:</strong> {types?.join(", ") || "-"}</p>
      {evolvesFrom && <p><strong>Vyvíjí se z:</strong> {evolvesFrom}</p>}
      {flavorText && <p><strong>Flavor Text:</strong> <em>{flavorText}</em></p>}
      <p><strong>Číslo:</strong> {card.number}/{set.printedTotal}</p>
      <p><strong>Série:</strong> {set?.name} ({set?.id})</p>
      <p><strong>Datum vydání:</strong> {set?.releaseDate || "-"}</p>
      <p><strong>Retreat cost:</strong> {retreatCost?.join(", ") || "–"}</p>
      <p><strong>Weakness:</strong> {weaknesses?.map(w => `${w.type} ×${w.value}`).join(", ")}</p>
      <p><strong>Resistance:</strong> {resistances?.map(r => `${r.type} ×${r.value}`).join(", ")}</p>

      {attacks?.length > 0 && (
        <>
          <h2>⚔️ Útoky</h2>
          {attacks.map((atk) => (
            <p key={atk.name}>
              <strong>{atk.name}</strong> [{atk.cost.join(", ")}] – {atk.damage || "–"}<br />
              {atk.text}
            </p>
          ))}
        </>
      )}

      {tcgplayer?.url && (
        <>
          <h2>🛒 Karta na TCGPlayer</h2>
          <a href={tcgplayer.url} target="_blank" rel="noopener noreferrer">
            Otevřít na TCGPlayer.com ↗
          </a>
        </>
      )}
    </div>
  );
}
