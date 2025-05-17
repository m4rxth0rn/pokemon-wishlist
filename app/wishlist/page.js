"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import supabase from "@/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import styles from "./WishlistPage.module.css";

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState([]);
  const debounceTimers = useRef({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndWishlist = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadWishlist(session.user.id);
      }
      setLoading(false);
    };

    fetchUserAndWishlist();

    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [router]);

  const loadWishlist = async (userId) => {
    const { data: wishlistData } = await supabase
      .from("wishlist")
      .select("*")
      .eq("user_id", userId);

    if (!wishlistData) return;

    const enriched = await Promise.all(
      wishlistData.map(async (item) => {
        try {
          const res = await axios.get(
            `https://api.pokemontcg.io/v2/cards/${item.card_id}?include=tcgplayer`
          );
          return { ...item, card: res.data.data };
        } catch {
          return { ...item, card: null };
        }
      })
    );

    const filtered = enriched.filter((item) => item.card !== null);
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.card.set.releaseDate);
      const dateB = new Date(b.card.set.releaseDate);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;

      const numA = parseInt(a.card.number.replace(/\D/g, ""), 10);
      const numB = parseInt(b.card.number.replace(/\D/g, ""), 10);
      return numB - numA;
    });

    setWishlist(sorted);
  };

  const removeFromWishlist = async (cardId) => {
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("card_id", cardId)
      .eq("user_id", user.id);
    if (!error) {
      setWishlist((prev) => prev.filter((item) => item.card_id !== cardId));
    }
  };

  const updateNote = async (cardId, note) => {
    await supabase
      .from("wishlist")
      .update({ note })
      .eq("card_id", cardId)
      .eq("user_id", user.id);
  };

  const handleNoteChange = (cardId, note) => {
    setWishlist((prev) =>
      prev.map((item) =>
        item.card_id === cardId ? { ...item, note } : item
      )
    );

    clearTimeout(debounceTimers.current[cardId]);
    debounceTimers.current[cardId] = setTimeout(() => {
      updateNote(cardId, note);
    }, 1000);
  };

  const exportToExcel = () => {
    if (!wishlist || wishlist.length === 0) return;

    const exportData = wishlist.map((item) => ({
      Název: item.card?.name || "",
      Set: item.card?.set?.name || "",
      Číslo:
        item.card?.number && item.card?.set?.total
          ? `${item.card.number} / ${item.card.set.total}`
          : item.card?.number || "",
      Rarita: item.card?.rarity || "",
      Poznámka: item.note || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const imageColumn = "F";
    wishlist.forEach((item, index) => {
      const imageUrl = item.card?.images?.small || item.image || "";
      const cellAddress = `${imageColumn}${index + 2}`;
      worksheet[cellAddress] = {
        f: `HYPERLINK(\"${imageUrl}\", \"Obrázek\")`,
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Wishlist");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "wishlist.xlsx");
  };

  const handleCardClick = (cardId) => {
    const index = wishlist.findIndex((item) => item.card_id === cardId);
    const ids = wishlist.map((item) => item.card_id).join(",");
    const setId = wishlist[index]?.card?.set?.id || "unknown";
    router.push(`/sets/${setId}/cards/${cardId}?from=wishlist&ids=${ids}&index=${index}`);
  };

  return (
   <div className={`${styles.pageBackground} ${styles.container}`}>

      <h1 className={styles.title}>📜 Můj Wishlist</h1>

      {user && (
        <button onClick={exportToExcel} className={styles.exportButton}>
          📁 Exportovat do Excelu
        </button>
      )}

      {loading ? (
        <p>⏳ Načítám wishlist...</p>
      ) : !user ? (
        <p>❌ Wishlist je dostupný pouze po přihlášení.</p>
      ) : wishlist.length === 0 ? (
        <p>😥 Wishlist je prázdný.</p>
      ) : (
        <>
          {/* 👇 Rezerva pro hover efekt */}
          <div style={{ height: "80px" }} />

          <div className={styles.cardGrid}>
            {wishlist.map((item) => (
              <div
                key={item.card_id}
                className={styles.card}
                onClick={() => handleCardClick(item.card_id)}
              >
                <div>
                  <img
                    src={item.card?.images?.small || item.image}
                    alt={item.card?.name}
                    className={styles.cardImage}
                  />
                  <p className={styles.cardTitle}>{item.card?.name}</p>
                  <p className={styles.cardSet}>
                    {item.card?.set?.name} {item.card?.number}/{item.card?.set?.printedTotal}
                  </p>
                </div>

                <div className={styles.noteArea} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Poznámka"
                    value={item.note || ""}
                    onChange={(e) => handleNoteChange(item.card_id, e.target.value)}
                    className={styles.noteInput}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromWishlist(item.card_id);
                    }}
                    className={styles.removeButton}
                  >
                    ❌ Odebrat z wishlistu
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
