import { prisma } from "../../src/db/index.js";
import { seedRoles } from './roles.js';
import { seedTags } from './tags.js';

async function main() {
  console.log('🌱 Starting Database Seeding...\n');
  
  await seedRoles(prisma);
  console.log('\n-------------------\n');
  
  await seedTags(prisma);
  
  console.log('\n✨ All Seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });