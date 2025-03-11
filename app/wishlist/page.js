"use client";

import React, { useEffect, useState, Suspense } from "react";
import supabase from "@/supabase";
import { useSearchParams } from "next/navigation";

function WishlistContent() {
  const searchParams = useSearchParams();
  const [wishlist, setWishlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");

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

  const filteredWishlist = wishlist.filter((card) =>
    card.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1>📜 Můj Pokémon Wishlist</h1>

      <input
        type="text"
        placeholder="Hledat v wishlistu..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {filteredWishlist.length === 0 ? (
        <p>😢 Wishlist je prázdný.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
          {filteredWishlist.map((card) => (
            <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
              <img src={card.image} alt={card.name} width="150" />
              <p>
                {card.set} | {card.number}
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
