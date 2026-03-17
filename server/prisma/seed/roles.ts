import { PrismaClient } from '../../generated/prisma/client.js';

export const seedRoles = async (prisma: PrismaClient) => {
  const roles = [
    { name: 'admin', description: 'Administrator' },
    { name: 'groupOwner', description: 'Group Owner' },
    { name: 'groupMember', description: 'Group Member' },
  ];

  console.log('🚀 Starting Roles Seeding...');
  for (const role of roles) {
    const createdRole = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    console.log(`✅ Upserted Role: ${createdRole.name}`);
  }
};