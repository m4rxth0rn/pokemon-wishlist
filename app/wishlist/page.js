"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import supabase from "@/supabase";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export default function Wishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchWishlist = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.from("wishlist").select("*");
        if (!data) return;

        const enriched = await Promise.all(
          data.map(async (item) => {
            try {
              const res = await axios.get(
                `https://api.pokemontcg.io/v2/cards/${item.id}?include=tcgplayer`
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
      } catch (err) {
        console.error("Chyba při načítání wishlistu:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();

    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const removeFromWishlist = async (id) => {
    const { error } = await supabase.from("wishlist").delete().eq("id", id);
    if (!error) {
      setWishlist((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const exportToExcel = () => {
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
        f: `HYPERLINK("${imageUrl}", "Obrázek")`,
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Wishlist");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "wishlist.xlsx");
  };

  const handleCardClick = (cardId) => {
    const index = wishlist.findIndex((item) => item.id === cardId);
    const ids = wishlist.map((item) => item.id).join(",");
    const setId = wishlist[index]?.card?.set?.id || "unknown";
    router.push(`/sets/${setId}/cards/${cardId}?from=wishlist&ids=${ids}&index=${index}`);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Wishlist</h1>

      <button
        onClick={exportToExcel}
        style={{
          marginBottom: "20px",
          padding: "10px 16px",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        📁 Exportovat do Excelu
      </button>

      {loading ? (
        <p>⏳ Načítám wishlist...</p>
      ) : wishlist.length === 0 ? (
        <p>😢 Wishlist je prázdný.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
          }}
        >
          {wishlist.map((item, index) => (
            <div
              key={item.id}
              style={{
                textAlign: "center",
                cursor: "pointer",
                transition: "transform 0.2s",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "460px",
                padding: "10px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              }}
              onClick={() => handleCardClick(item.id)}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <div>
                <img src={item.image} alt={item.card?.name} width="150" style={{ marginBottom: "8px" }} />
                <p style={{
                  fontWeight: "bold",
                  fontSize: isMobile ? "13px" : "15px",
                  marginBottom: "4px",
                  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  wordBreak: "break-word"
                }}>
                  {item.card?.name}
                </p>
                <p style={{
                  fontSize: "13px",
                  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                  wordBreak: "break-word"
                }}>
                  {item.card?.set?.name} {item.card?.number}/{item.card?.set?.total}
                </p>
              </div>

              <div style={{
                marginTop: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                justifyContent: "flex-end"
              }}>
                <div style={{ width: "140px", display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    placeholder="Poznámka"
                    value={typeof item.note === "string" ? item.note : ""}
                    onChange={(e) => {
                      const newNote = e.target.value;
                      setWishlist((prev) =>
                        prev.map((w, i) => (i === index ? { ...w, note: newNote } : w))
                      );
                    }}
                    onBlur={async (e) => {
                      const newNote = e.target.value;
                      const { error } = await supabase
                        .from("wishlist")
                        .update({ note: newNote || null })
                        .eq("id", item.id);
                      if (error) {
                        console.error("Chyba při ukládání poznámky:", error.message);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "6px",
                      fontSize: "13px",
                      background: "#fff",
                      border: "1px solid #cba9ff",
                      borderRadius: "8px",
                      textAlign: "center",
                      outline: "none",
                      fontFamily: '"Segoe UI", Roboto, sans-serif'
                    }}
                  />
                  {!!item.note?.trim() && (
                    <button
                      title="Odstranit poznámku"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const { error } = await supabase
                          .from("wishlist")
                          .update({ note: null })
                          .eq("id", item.id);
                        if (!error) {
                          setWishlist((prev) =>
                            prev.map((w, i) => (i === index ? { ...w, note: "" } : w))
                          );
                        }
                      }}
                      style={{
                        backgroundColor: "#fff",
                        border: "1px solid #ddd",
                        color: "#c2185b",
                        fontSize: "14px",
                        borderRadius: "50%",
                        padding: "2px 6px",
                        cursor: "pointer",
                        lineHeight: "1",
                        height: "26px"
                      }}
                    >
                      ✖
                    </button>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromWishlist(item.id);
                  }}
                  style={{
                    width: "140px",
                    backgroundColor: "#ff4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontFamily: '"Segoe UI", Roboto, sans-serif'
                  }}
                >
                  ❌ Odebrat z wishlistu
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
