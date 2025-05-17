  "use client";
  export const dynamic = "force-dynamic";

  import React, { useEffect, useState } from "react";
  import Link from "next/link";
  import { useParams } from "next/navigation";
  import axios from "axios";
  import supabase from "@/supabase";


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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchWishlist(session.user.id);
        }
        await fetchCards();
      };

      fetchData();

      const subscription = supabase
        .channel("wishlist")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "wishlist",
        }, () => {
          if (user) fetchWishlist(user.id);
        })
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

      await supabase.from("wishlist").insert([{ 
   card_id: card.id, 
   name: formattedName, 
   image: card.images.small, 
   number: card.number, 
   set: card.set.name, 
   releaseDate: card.set.releaseDate || "9999-12-31", 
  user_id: user.id, 
 }]);

    await fetchWishlist(user.id);
  };


    const handleRemoveFromWishlist = async (card) => {
      if (!user) return;
      await supabase.from("wishlist").delete().eq("card_id", card.id).eq("user_id", user.id);
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

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
          justifyItems: "center",
          alignItems: "start",
          padding: "10px",
          width: "100%",
          margin: "0 auto"
        }}>
          {sortedCards().map((card) => (
            <div
              key={card.id}
              style={{
                margin: "10px",
                textAlign: "center",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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
               <p style={{
  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: "8px 0",
  fontWeight: "bold",
  textAlign: "center",
  fontSize: isMobile ? "13px" : "15px",
  lineHeight: "1.2",
  padding: "0 4px",
  wordBreak: "break-word",
  minHeight: "40px", 
}}>
  {card.name}
</p>

                <p style={{
  fontSize: "13px",
  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  textAlign: "center",
  margin: "4px 0",
  minHeight: "32px", 
}}>
  {card.set.name} {card.number}/{card.set.printedTotal}
</p>

                <p>💰 {getCardPrice(card)}</p>
              </Link>

              {user && (
                wishlist.has(card.id) ? (
                  <button
                    onClick={() => handleRemoveFromWishlist(card)}
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    style={{
                      width: "140px",
                      backgroundColor:
                        isMobile || hoveredCardId === card.id ? "#ff4444" : "#e0ffe0",
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
                )
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
