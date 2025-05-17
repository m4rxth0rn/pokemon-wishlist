"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import supabase from "@/supabase";

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
      const { data, error } = await supabase 
    .from("wishlist") 
    .select("card_id")
    .eq("user_id", userId);

  if (error) {
    console.error("❌ Chyba při načítání wishlistu:", error);
    return;
  }

  setWishlist(new Set(data.map((c) => c.card_id))); 
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
  if (!user || !user.id || !card || !card.id || !card.images?.small) {
    console.warn("⚠️ Nelze přidat na wishlist – uživatel nebo karta chybí.");
    return;
  }

  const wishlistItem = {
    card_id: String(card.id),
    name: String(`${card.name?.split("|")[0].trim()} | ${card.set.name} ${card.number}/${card.set.printedTotal}`),
    image: String(card.images.small),
    number: String(card.number),
    set: String(card.set.name),
    releaseDate: String(card.set.releaseDate || "9999-12-31"),
    user_id: user.id,
  };

  try {
  const { error } = await supabase
 .from("wishlist") 
.insert([wishlistItem]);
    if (error) {
      console.error("❌ Supabase chyba:", error.message || error);
    } else {
      console.log("✅ Přidáno na wishlist:");
      await fetchWishlist(user.id);
    }
  } catch (e) {
    console.error("❌ Výjimka při ukládání:", e.message || e);
  }
};

const removeFromWishlist = async () => {
  if (!user || !user.id || !card?.id) {
    console.warn("⚠️ Nelze odebrat z wishlistu – uživatel nebo karta chybí.");
    return;
  }

  try {
    await supabase
      .from("wishlist")
      .delete()
      .eq("card_id", card.id)
      .eq("user_id", user.id);

    await fetchWishlist(user.id);
  } catch (error) {
    console.error("Chyba při odebrání z wishlistu:", error);
  }
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
            try {
              const res = await axios.get(`https://api.pokemontcg.io/v2/cards/${id}`);
              cards.push(res.data.data);
              await delay(200);
            } catch (e) {
              console.warn("Chyba při načítání karty:", id, e.message);
            }
          }
          setAllCards(cards);
          setCurrentIndex(initialIndex);
          await fetchCard(cards[initialIndex]?.id);
        } else {
          const res = await axios.get(`https://api.pokemontcg.io/v2/cards/${cardId}?include=tcgplayer`);
          setCard(res.data.data);
          const setCardsRes = await axios.get(
            `https://api.pokemontcg.io/v2/cards?q=set.id:%22${setId}%22&orderBy=number`
          );
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

  const goToCard = (index) => {
    const nextCard = allCards[index];
    const baseUrl = fromWishlist
      ? `/sets/${nextCard.set.id}/cards/${nextCard.id}?from=wishlist&ids=${idList.join(",")}&index=${index}`
      : `/sets/${nextCard.set.id}/cards/${nextCard.id}`;
    router.push(baseUrl);
  };

  if (loading) return <p>⏳ Načítám...</p>;
  if (!card) return <p>😢 Karta nenalezena.</p>;

  const {
    name,
    images,
    hp,
    types,
    evolvesFrom,
    flavorText,
    rarity,
    attacks,
    weaknesses,
    resistances,
    retreatCost,
    tcgplayer,
    set,
  } = card;

  const rarityIcons = {
    Common: "🔹",
    Uncommon: "🔸",
    Rare: "⭐",
    "Rare Holo": "🌟",
    "Rare Ultra": "✨",
    "Rare Secret": "💎",
  };

  const rawVariants = tcgplayer?.prices || {};
  const availableVersions = Object.keys(rawVariants)
    .filter((v) => rawVariants[v]?.market)
    .map((v) => {
      if (v === "normal") return "Normal";
      if (v === "reverseHolofoil") return "Reverse Holo";
      if (v === "holofoil") return "Holo";
      return v;
    });

  const btnInWishlist = wishlist.has(card.id);

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => router.back()}>🔙 Zpět</button>
       
      <button
  onClick={() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }}
  style={{
    padding: "3px 8px",
    fontSize: "13px",
    margin: "0 4px",
    border: "1px solid #ccc",
    borderRadius: "3px",
    cursor: "pointer"
  }}
>
  {copied ? "📋 Odkaz zkopírován" : "📋 Sdílet"}
</button>
        {user && (
      <button onClick={() => (btnInWishlist ? removeFromWishlist() : addToWishlist())}
  onMouseEnter={() => { if (!isMobile) setHoverRemove(true); }}
  onMouseLeave={() => { if (!isMobile) setHoverRemove(false); }}
  style={{
   backgroundColor: btnInWishlist
    ? (hoverRemove || isMobile ? "#ff4444" : "#e0ffe0")
    : "#4CAF50",
  color: btnInWishlist
    ? (hoverRemove || isMobile ? "#fff" : "#000")
    : "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "8px 16px",
  fontSize: "14px",
  cursor: "pointer",
  fontWeight: "bold",
  transition: "all 0.2s ease-in-out",
  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
  }}
>
  {!btnInWishlist
    ? "➕ Přidat do wishlistu"
    : isMobile
    ? "❌ Odebrat z wishlistu"
    : hoverRemove
    ? "❌ Odebrat z wishlistu"
    : "✅ Karta je na wishlistu"}
</button>
)}



      <h1>
        {name} {rarityIcons[rarity] || ""}
        {set?.images?.symbol && (
          <img
            src={set.images.symbol}
            alt="Set icon"
            style={{ height: 24, marginLeft: 8, verticalAlign: "middle" }}
          />
        )}
      </h1>

      <img
        src={images.large}
        alt={name}
        style={{ width: 300, cursor: "pointer" }}
        onClick={() => setModalOpen(true)}
      />

      {modalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}>
          <div ref={modalRef} style={{ position: "relative" }}>
            <img src={images.large} alt={name} style={{ maxWidth: "90vw", maxHeight: "90vh" }} />
            {isMobile && (
              <button onClick={() => setModalOpen(false)} style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "5px",
              }}>
                Zavřít
              </button>
            )}
          </div>
        </div>
      )}

      <p><strong>HP:</strong> {hp || "-"}</p>
      <p><strong>Typy:</strong> {types?.join(", ") || "-"}</p>
      {evolvesFrom && <p><strong>Vyvíjí se z:</strong> {evolvesFrom}</p>}
      {flavorText && <p><strong>Flavor Text:</strong> <em>{flavorText}</em></p>}
      <p><strong>Číslo:</strong> {card.number}/{set.printedTotal}</p>
      <p><strong>Retreat cost:</strong> {retreatCost?.join(", ") || "–"}</p>
      <p><strong>Weakness:</strong> {weaknesses?.map(w => `${w.type} ×${w.value}`).join(", ")}</p>
      <p><strong>Resistance:</strong> {resistances?.map(r => `${r.type} ×${r.value}`).join(", ")}</p>

      {availableVersions.length > 0 && (
        <>
          <p><strong>Dostupné verze:</strong></p>
          <ul>
            {availableVersions.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </>
      )}

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

      {!fromSearch && (
        <>
          <p><strong>Pozice v {fromWishlist ? "wishlistu" : "setu"}:</strong> {currentIndex + 1} / {allCards.length}</p>
          <button onClick={() => currentIndex > 0 && goToCard(currentIndex - 1)} disabled={currentIndex <= 0}>
            ⬅️ Předchozí karta
          </button>
          <button onClick={() => currentIndex < allCards.length - 1 && goToCard(currentIndex + 1)} disabled={currentIndex >= allCards.length - 1}>
            Další karta ➡️
          </button>
        </>
      )}
    </div>
  );
}
