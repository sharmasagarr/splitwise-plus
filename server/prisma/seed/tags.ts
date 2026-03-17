import { PrismaClient } from '../../generated/prisma/client.js';

export const seedTags = async (prisma: PrismaClient) => {
  const tags = [
    'Food',
    'Rent',
    'Bills',
    'Transport',
    'Shopping',
    'Travel',
    'Health',
    'Entertainment',
    'Work',
    'Other',
  ];

  console.log('🚀 Starting Tags Seeding...');
  for (const tagName of tags) {
    const createdTag = await prisma.tag.upsert({
      where: { name: tagName },
      update: {},
      create: { name: tagName },
    });
    console.log(`✅ Upserted Tag: ${createdTag.name}`);
  }
};