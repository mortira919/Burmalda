const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@studio.kz' },
    update: {},
    create: {
      email: 'admin@studio.kz',
      password,
      name: 'Администратор',
      role: 'admin',
    },
  });

  await prisma.settings.upsert({
    where: { key: 'tax_rate' },
    update: {},
    create: { key: 'tax_rate', value: '5' },
  });

  await prisma.settings.upsert({
    where: { key: 'company_name' },
    update: {},
    create: { key: 'company_name', value: 'Моя Студия' },
  });

  await prisma.settings.upsert({
    where: { key: 'currency' },
    update: {},
    create: { key: 'currency', value: '₸' },
  });

  const employees = [
    { name: 'Артём', role: 'mobile', defaultPercent: 35 },
    { name: 'Дмитрий', role: 'backend', defaultPercent: 20 },
    { name: 'Радион', role: 'designer', defaultPercent: 45 },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { id: employees.indexOf(emp) + 1 },
      update: {},
      create: emp,
    });
  }

  console.log('Seed completed. Login: admin@studio.kz / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
