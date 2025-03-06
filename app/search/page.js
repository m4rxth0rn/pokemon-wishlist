"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import supabase from "@/supabase";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState(new Set());

  // 📌 Načtení wishlistu
  const fetchWishlist = async () => {
    const { data } = await supabase.from("wishlist").select("id");
    setWishlist(new Set(data.map((card) => card.id)));
  };

  useEffect(() => {
    fetchWishlist();
    const subscription = supabase
      .channel("wishlist")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wishlist" },
        () => fetchWishlist()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // 📌 Definované pořadí setů
  const eraOrder = [
    "Base Set", "Jungle", "Fossil", "Team Rocket", "Gym Heroes", "Gym Challenge",
    "Neo Genesis", "Neo Discovery", "Neo Revelation", "Neo Destiny",
    "Expedition Base Set", "Aquapolis", "Skyridge",
    "EX Ruby & Sapphire", "EX Sandstorm", "EX Dragon", "EX Team Magma vs Team Aqua",
    "EX Hidden Legends", "EX FireRed & LeafGreen", "EX Team Rocket Returns",
    "EX Deoxys", "EX Emerald", "EX Unseen Forces", "EX Delta Species",
    "EX Legend Maker", "EX Holon Phantoms", "EX Crystal Guardians",
    "EX Dragon Frontiers", "EX Power Keepers",
    "Diamond & Pearl", "Mysterious Treasures", "Secret Wonders", "Great Encounters",
    "Majestic Dawn", "Legends Awakened", "Stormfront",
    "Platinum", "Rising Rivals", "Supreme Victors", "Arceus",
    "HeartGold & SoulSilver", "Unleashed", "Undaunted", "Triumphant",
    "Call of Legends",
    "Black & White", "Emerging Powers", "Noble Victories", "Next Destinies",
    "Dark Explorers", "Dragons Exalted", "Boundaries Crossed", "Plasma Storm",
    "Plasma Freeze", "Plasma Blast", "Legendary Treasures",
    "XY", "Flashfire", "Furious Fists", "Phantom Forces", "Primal Clash",
    "Roaring Skies", "Ancient Origins", "BREAKthrough", "BREAKpoint",
    "Generations", "Fates Collide", "Steam Siege", "Evolutions",
    "Sun & Moon", "Guardians Rising", "Burning Shadows", "Crimson Invasion",
    "Ultra Prism", "Forbidden Light", "Celestial Storm", "Lost Thunder",
    "Team Up", "Detective Pikachu", "Unbroken Bonds", "Unified Minds",
    "Hidden Fates", "Cosmic Eclipse",
    "Sword & Shield", "Rebel Clash", "Darkness Ablaze", "Champion's Path",
    "Vivid Voltage", "Shining Fates", "Battle Styles", "Chilling Reign",
    "Evolving Skies", "Celebrations", "Fusion Strike", "Brilliant Stars",
    "Astral Radiance", "Pokémon GO", "Lost Origin", "Silver Tempest",
    "Scarlet & Violet", "Paldea Evolved", "Obsidian Flames", "Paradox Rift",
    "Temporal Forces", "Twilight Masquerade"
  ];

  // 📌 Oprava názvu setů a správné řazení
  const normalizeSetName = (setName) => {
    if (setName.includes("Base Set")) return "Base Set"; // ✅ Oprava všech variant názvu Base Set
    return setName.replace("Black Star Promos", "").trim();
  };

  const sortCardsBySetAge = (cards) => {
    return [...cards].sort((a, b) => {
      let setA = normalizeSetName(a.set.name);
      let setB = normalizeSetName(b.set.name);

      let indexA = eraOrder.indexOf(setA);
      let indexB = eraOrder.indexOf(setB);

      if (a.set.series.includes("Black Star Promos")) return 1; // ✅ Proma na konec éry
      if (b.set.series.includes("Black Star Promos")) return -1;

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  };

  // 📌 Hledání karet
  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);

    try {
      const res = await axios.get(`https://api.pokemontcg.io/v2/cards?q=name:"${searchTerm}"`);
      const sortedCards = sortCardsBySetAge(res.data.data || []);
      setCards(sortedCards);
    } catch (error) {
      console.error("Chyba při načítání karet:", error);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>🔍 Hledej Pokémon karty</h1>

      <input
        type="text"
        placeholder="Zadej jméno karty..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />

      <h2>Výsledky:</h2>
      {loading && <p>⏳ Načítám...</p>}
      {!loading && cards.length === 0 && <p>😢 Nic nebylo nalezeno.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", marginTop: "20px" }}>
        {!loading &&
          cards.map((card) => (
            <div key={card.id} style={{ margin: "10px", textAlign: "center" }}>
              <img src={card.images.small} alt={card.name} width="150" />
              <p>{card.name}</p>
              <p>{card.set.name} | {card.number}/{card.set.printedTotal}</p>

              {wishlist.has(card.id) ? (
                <>
                  <button onClick={() => handleRemoveFromWishlist(card)}>❌ Odebrat z wishlistu</button>
                  <p>✅ Karta je na wishlistu</p>
                </>
              ) : (
                <button onClick={() => handleAddToWishlist(card)}>➕ Přidat do wishlistu</button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
