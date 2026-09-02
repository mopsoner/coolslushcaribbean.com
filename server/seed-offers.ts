import { storage } from "./storage";

async function seedOffersAndPrices() {
  console.log("🌱 Seeding offers and prices...");

  const offers = [
    {
      name: "1 Journée",
      basePriceCents: 15000,
      description: "Location pour une journée complète",
      active: true,
    },
    {
      name: "Week-end",
      basePriceCents: 25000,
      description: "Location pour un week-end (2-3 jours)",
      active: true,
    },
    {
      name: "Événement",
      basePriceCents: 35000,
      description: "Location pour un événement spécial",
      active: true,
    },
  ];

  for (const offerData of offers) {
    const existingOffer = await storage.getOfferByName(offerData.name);
    
    if (!existingOffer) {
      console.log(`  Creating offer: ${offerData.name}`);
      const offer = await storage.createOffer(offerData);
      
      console.log(`  Default price for ${offerData.name}: ${offer.basePriceCents / 100}€`);
    } else {
      console.log(`  Offer already exists: ${offerData.name}`);
    }
  }

  console.log("✅ Seeding completed!");
  process.exit(0);
}

seedOffersAndPrices().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
