import { db } from './index';
import { machines } from '../shared/schema';

async function seed() {
  console.log('Seeding database...');
  
  // Check if machines already exist
  const existingMachines = await db.select().from(machines);
  
  if (existingMachines.length > 0) {
    console.log('Machines already exist, skipping seed');
    return;
  }
  
  // Create initial machines
  await db.insert(machines).values([
    {
      name: "EZBASICS Slushy Machine #1",
      status: "AVAILABLE",
    },
    {
      name: "EZBASICS Slushy Machine #2",
      status: "UNAVAILABLE",
    },
    {
      name: "EZBASICS Slushy Machine #3",
      status: "MAINTENANCE",
    },
  ]);
  
  console.log('✅ Database seeded successfully with 3 machines');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
