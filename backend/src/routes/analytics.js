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

    const [activeProjects, urgentDeadlines, totalDebt, newLeads, totalTxRevenue, totalPrepayments] = await Promise.all([
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
      prisma.project.aggregate({
        _sum: { prepayment: true },
      }),
    ]);

    const debt = (totalDebt._sum.budget || 0) - (totalDebt._sum.prepayment || 0);
    const totalRevenue = (totalTxRevenue._sum.amount || 0) + (totalPrepayments._sum.prepayment || 0);

    res.json({
      activeProjects,
      urgentDeadlines,
      expectedPayments: debt,
      newLeads,
      totalRevenue,
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

    const [income, prepaymentData, expenseData, salaryData, newLeads, closedProjects, activeProjects] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'income', date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.project.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _sum: { prepayment: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.salaryPayment.aggregate({
        where: { date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.lead.count({ where: { createdAt: { gte: from, lte: to } } }),
      prisma.project.count({ where: { status: 'completed', updatedAt: { gte: from, lte: to } } }),
      prisma.project.count({ where: { status: { not: 'completed' } } }),
    ]);

    const txRevenue = income._sum.amount || 0;
    const prepayments = prepaymentData._sum.prepayment || 0;
    const revenue = txRevenue + prepayments;
    const expenses = expenseData._sum.amount || 0;
    const salaryTotal = salaryData._sum.amount || 0;
    const tax = (revenue * taxRate) / 100;
    const netProfit = revenue - tax - expenses - salaryTotal;

    res.json({
      revenue,
      taxRate,
      tax,
      expenses,
      salaryTotal,
      netProfit,
      newLeads,
      closedProjects,
      activeProjects,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
