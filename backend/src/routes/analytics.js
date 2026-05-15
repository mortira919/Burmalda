const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const [activeProjects, urgentDeadlines, totalDebt, newLeads, totalRevenue] = await Promise.all([
      prisma.project.count({ where: { status: { not: 'completed' } } }),
      prisma.project.findMany({
        where: {
          status: { not: 'completed' },
          deadline: { gte: now, lte: in5Days },
        },
        include: { client: { select: { name: true } } },
        orderBy: { deadline: 'asc' },
      }),
      prisma.project.aggregate({
        where: { status: { not: 'completed' } },
        _sum: { budget: true, prepayment: true },
      }),
      prisma.lead.count({ where: { status: { not: 'converted' } } }),
      prisma.transaction.aggregate({
        where: { type: 'income' },
        _sum: { amount: true },
      }),
    ]);

    const debt = (totalDebt._sum.budget || 0) - (totalDebt._sum.prepayment || 0);

    res.json({
      activeProjects,
      urgentDeadlines,
      expectedPayments: debt,
      newLeads,
      totalRevenue: totalRevenue._sum.amount || 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 0, 23, 59, 59);

    const taxSetting = await prisma.settings.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;

    const [income, expenseData, newLeads, closedProjects, activeProjects] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'income', date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.lead.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.project.count({ where: { status: 'completed', updatedAt: { gte: from, lte: to } } }),
      prisma.project.count({ where: { status: { not: 'completed' } } }),
    ]);

    const revenue = income._sum.amount || 0;
    const expenses = expenseData._sum.amount || 0;
    const tax = (revenue * taxRate) / 100;
    const netProfit = revenue - tax - expenses;

    // Salary total from active projects for the month
    const projects = await prisma.project.findMany({
      where: { updatedAt: { gte: from, lte: to } },
      include: { members: true },
    });

    let salaryTotal = 0;
    for (const p of projects) {
      const distrib = p.budget * (1 - taxRate / 100);
      for (const m of p.members) {
        salaryTotal += (distrib * m.percent) / 100;
      }
    }

    res.json({
      revenue,
      tax,
      expenses,
      salaryTotal,
      netProfit: netProfit - salaryTotal,
      newLeads,
      closedProjects,
      activeProjects,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
