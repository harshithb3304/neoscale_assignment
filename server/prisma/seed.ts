import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Ensure Supabase users exist before inserting data
  const supabaseUsers = [
    { id: '550e8400-e29b-41d4-a716-446655440000', email: 'alice@example.com', name: 'Alice Johnson' },
    { id: '550e8400-e29b-41d4-a716-446655440001', email: 'bob@example.com', name: 'Bob Smith' },
    { id: '550e8400-e29b-41d4-a716-446655440002', email: 'charlie@example.com', name: 'Charlie Brown' },
    { id: '71f856ca-47a8-4e86-bb46-d1ce8c61fd00', email: 'cs22b2015@iiitdm.ac.in', name: 'CS Student' },
    { id: '715c2452-b13a-4bac-a0d9-be36778ce733', email: 'harsh03032004@gmail.com', name: 'Harshith' },
  ];

  // Insert or update users
  for (const user of supabaseUsers) {
    await prisma.user.upsert({
      where: { id: user.id }, // Ensure correct mapping
      update: {},
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        googleid: user.id,
      },
    });
  }

  console.log("✅ Users seeded successfully.");

  // Fetch inserted users
  const [user1, user2, user3, user4, user5] = await Promise.all(
    supabaseUsers.map((user) => prisma.user.findUnique({ where: { id: user.id } }))
  );

  if (!user1 || !user2 || !user3 || !user4 || !user5) throw new Error('Users not found');

  console.log("✅ User retrieval confirmed.");

  // Delete all existing friend relationships
  await prisma.friend.deleteMany();

  // Create friend relationships
  await prisma.friend.createMany({
    data: [
      { userId: user1.id, friendId: user2.id },
      { userId: user1.id, friendId: user3.id },
      { userId: user2.id, friendId: user3.id },
      { userId: user4.id, friendId: user5.id }, // Add friendship between cs22b2015@iiitdm.ac.in and harsh03032004@gmail.com
    ],
  });

  console.log("✅ Friend relationships seeded.");

  // Create transactions for cs22b2015@iiitdm.ac.in
  const transaction1 = await prisma.transaction.create({
    data: {
      amount: 100.0,
      description: 'Lunch at Cafe',
      date: new Date('2025-03-15'),
      userId: user4.id,  // cs22b2015@iiitdm.ac.in
      issplit: false,
    },
  });

  const transaction2 = await prisma.transaction.create({
    data: {
      amount: 200.0,
      description: 'Movie tickets',
      date: new Date('2025-03-16'),
      userId: user4.id,  // cs22b2015@iiitdm.ac.in
      issplit: true,
    },
  });

  // Create transactions for harsh03032004@gmail.com
  const transaction3 = await prisma.transaction.create({
    data: {
      amount: 150.0,
      description: 'Groceries',
      date: new Date('2025-03-17'),
      userId: user5.id,  // harsh03032004@gmail.com
      issplit: false,
    },
  });

  const transaction4 = await prisma.transaction.create({
    data: {
      amount: 300.0,
      description: 'Dinner at Restaurant',
      date: new Date('2025-03-18'),
      userId: user5.id,  // harsh03032004@gmail.com
      issplit: true,
    },
  });

  console.log("✅ Transactions seeded.");

  // Create splits for transaction2 (cs22b2015@iiitdm.ac.in)
  await prisma.split.createMany({
    data: [
      { transactionId: transaction2.id, userId: user5.id, amount: 100.0 }, // Split with harsh03032004@gmail.com
    ],
  });

  // Create splits for transaction4 (harsh03032004@gmail.com)
  await prisma.split.createMany({
    data: [
      { transactionId: transaction4.id, userId: user4.id, amount: 150.0 }, // Split with cs22b2015@iiitdm.ac.in
    ],
  });

  console.log("✅ Splits seeded successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });