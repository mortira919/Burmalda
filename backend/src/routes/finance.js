const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

// Transactions
router.get('/transactions', async (req, res) => {
  try {
    const { from, to, projectId, type } = req.query;
    const where = {};
    if (type) where.type = type;
    if (projectId) where.projectId = Number(projectId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { project: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const { projectId, type, amount, description, date } = req.body;
    const tx = await prisma.transaction.create({
      data: {
        projectId: projectId ? Number(projectId) : null,
        type,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
      },
      include: { project: { select: { id: true, name: true } } },
    });
    socket.emit('data:changed', { type: 'finance' });
    res.status(201).json(tx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    await prisma.transaction.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'finance' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Expenses
router.get('/expenses', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }
    const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
    res.json(expenses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
      },
    });
    socket.emit('data:changed', { type: 'finance' });
    res.status(201).json(expense);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'finance' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Salary calculation for a project
router.get('/salary/:projectId', async (req, res) => {
  try {
    const taxSetting = await prisma.settings.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;

    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.projectId) },
      include: { members: { include: { employee: true } } },
    });
    if (!project) return res.status(404).json({ error: 'Проект не найден' });

    const total = project.budget + (project.extraCost || 0);
    const tax = (total * taxRate) / 100;
    const distributable = total - tax;

    const salaryPayments = await prisma.salaryPayment.findMany({
      where: { projectId: Number(req.params.projectId) },
    });

    const paidByEmployee = {};
    for (const p of salaryPayments) {
      paidByEmployee[p.employeeId] = (paidByEmployee[p.employeeId] || 0) + p.amount;
    }

    const breakdown = project.members.map(m => ({
      employee: m.employee,
      percent: m.percent,
      amount: (distributable * m.percent) / 100,
      paid: paidByEmployee[m.employeeId] || 0,
    }));

    const totalDistributed = breakdown.reduce((s, b) => s + b.amount, 0);

    res.json({
      budget: project.budget,
      extraCost: project.extraCost || 0,
      total,
      taxRate,
      tax,
      distributable,
      breakdown,
      companyProfit: distributable - totalDistributed,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
