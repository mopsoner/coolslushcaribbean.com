import { storage } from "./storage";

async function seedOffersAndPrices() {
  console.log("🌱 Seeding offers and prices...");

  const offers = [
    {
      name: "1 Journée",
      description: "Location pour une journée complète",
      active: true,
    },
    {
      name: "Week-end",
      description: "Location pour un week-end (2-3 jours)",
      active: true,
    },
    {
      name: "Événement",
      description: "Location pour un événement spécial",
      active: true,
    },
  ];

  const defaultPrices = {
    "1 Journée": 15000, // 150€
    "Week-end": 25000,  // 250€
    "Événement": 35000, // 350€
  };

  for (const offerData of offers) {
    const existingOffer = await storage.getOfferByName(offerData.name);
    
    if (!existingOffer) {
      console.log(`  Creating offer: ${offerData.name}`);
      const offer = await storage.createOffer(offerData);
      
      const priceInCents = defaultPrices[offerData.name as keyof typeof defaultPrices];
      console.log(`  Setting default price for ${offerData.name}: ${priceInCents / 100}€`);
      
      await storage.createPriceConfiguration({
        offerId: offer.id,
        machineId: null,
        amountCents: priceInCents,
        currency: "EUR",
      });
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
