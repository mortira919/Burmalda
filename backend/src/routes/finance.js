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

// ── Tax records ──────────────────────────────────────────────

router.get('/taxes', async (req, res) => {
  try {
    const taxes = await prisma.taxRecord.findMany({ orderBy: { dueDate: 'desc' } });
    res.json(taxes);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Auto-calculate and create tax record for a period
router.post('/taxes/generate', async (req, res) => {
  try {
    const { year, half } = req.body; // half: 1 | 2
    const y = parseInt(year);
    const h = parseInt(half);

    const from = new Date(y, h === 1 ? 0 : 6, 1);          // Jan 1 or Jul 1
    const to   = new Date(y, h === 1 ? 6 : 12, 0, 23, 59, 59); // Jun 30 or Dec 31
    const dueDate = h === 1 ? new Date(y, 7, 25) : new Date(y + 1, 1, 25); // Aug 25 or Feb 25

    const period = `${y}-H${h}`;
    const label  = h === 1 ? `Январь–Июнь ${y}` : `Июль–Декабрь ${y}`;

    const existing = await prisma.taxRecord.findFirst({ where: { period } });
    if (existing) return res.status(400).json({ error: `Запись за ${label} уже существует` });

    const taxSetting = await prisma.settings.findUnique({ where: { key: 'tax_rate' } });
    const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;

    const [txIncome, prepayData] = await Promise.all([
      prisma.transaction.aggregate({
        where: { type: 'income', date: { gte: from, lte: to } },
        _sum: { amount: true },
      }),
      prisma.project.aggregate({
        where: { createdAt: { gte: from, lte: to } },
        _sum: { prepayment: true },
      }),
    ]);

    const totalIncome = (txIncome._sum.amount || 0) + (prepayData._sum.prepayment || 0);
    const amount = (totalIncome * taxRate) / 100;

    const record = await prisma.taxRecord.create({
      data: { period, label, amount, dueDate, status: 'pending' },
    });
    socket.emit('data:changed', { type: 'finance' });
    res.status(201).json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create manual tax record
router.post('/taxes', async (req, res) => {
  try {
    const { period, label, amount, dueDate, notes } = req.body;
    const record = await prisma.taxRecord.create({
      data: { period, label, amount: parseFloat(amount), dueDate: new Date(dueDate), notes },
    });
    socket.emit('data:changed', { type: 'finance' });
    res.status(201).json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mark as paid / update
router.patch('/taxes/:id', async (req, res) => {
  try {
    const { status, paid, paidAt, notes } = req.body;
    const data = {};
    if (status !== undefined) data.status = status;
    if (paid  !== undefined) data.paid   = parseFloat(paid);
    if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null;
    if (notes !== undefined) data.notes  = notes;
    const record = await prisma.taxRecord.update({ where: { id: Number(req.params.id) }, data });
    socket.emit('data:changed', { type: 'finance' });
    res.json(record);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/taxes/:id', async (req, res) => {
  try {
    await prisma.taxRecord.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'finance' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
