const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

async function autoDistribute(projectId, projectName, amount, projectPaymentId = null) {
  if (amount <= 0) return;
  const [taxSetting, members] = await Promise.all([
    prisma.settings.findUnique({ where: { key: 'tax_rate' } }),
    prisma.projectEmployee.findMany({ where: { projectId } }),
  ]);
  if (!members.length) return;
  const taxRate = taxSetting ? parseFloat(taxSetting.value) : 0;
  const distributable = amount * (1 - taxRate / 100);
  const label = `Авто: ${projectName} (+${Math.round(amount).toLocaleString('ru-RU')} ₸)`;
  await prisma.salaryPayment.createMany({
    data: members.map(m => ({
      employeeId: m.employeeId,
      projectId,
      projectPaymentId,
      amount: Math.round((distributable * m.percent / 100) * 100) / 100,
      date: new Date(),
      notes: label,
    })),
  });
}

router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        client: { select: { id: true, name: true } },
        members: { include: { employee: { select: { id: true, name: true, role: true } } } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: true,
        members: { include: { employee: true } },
        transactions: { orderBy: { date: 'desc' } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const data = {};
    if (req.body.status !== undefined) data.status = req.body.status;
    if (req.body.stage !== undefined) data.stage = req.body.stage;
    const project = await prisma.project.update({ where: { id: Number(req.params.id) }, data });
    socket.emit('data:changed', { type: 'project' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, clientId, status, priority, startDate, deadline, budget, extraCost, prepayment, marketingCost, docLink, notes, stage, members } = req.body;
    const prepaymentAmount = parseFloat(prepayment) || 0;
    const project = await prisma.project.create({
      data: {
        name,
        clientId: clientId ? parseInt(clientId) : null,
        status: status || 'development',
        priority: priority || 'medium',
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        budget: parseFloat(budget) || 0,
        extraCost: parseFloat(extraCost) || 0,
        prepayment: prepaymentAmount,
        marketingCost: parseFloat(marketingCost) || 0,
        docLink, notes,
        stage: stage || 'design',
        members: members?.length
          ? { create: members.map(m => ({ employeeId: m.employeeId, percent: parseFloat(m.percent) })) }
          : undefined,
      },
      include: { client: true, members: { include: { employee: true } }, payments: true },
    });
    if (prepaymentAmount > 0) {
      await autoDistribute(project.id, project.name, prepaymentAmount);
    }
    socket.emit('data:changed', { type: 'project' });
    socket.emit('data:changed', { type: 'employee' });
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, clientId, status, priority, startDate, deadline, budget, extraCost, prepayment, marketingCost, docLink, notes, stage, members } = req.body;
    const id = Number(req.params.id);
    const newPrepayment = parseFloat(prepayment) || 0;
    const old = await prisma.project.findUnique({ where: { id }, select: { prepayment: true, name: true } });
    const delta = newPrepayment - (old?.prepayment || 0);

    await prisma.projectEmployee.deleteMany({ where: { projectId: id } });
    const project = await prisma.project.update({
      where: { id },
      data: {
        name, clientId: clientId ? parseInt(clientId) : null,
        status, priority,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        budget: parseFloat(budget) || 0,
        extraCost: parseFloat(extraCost) || 0,
        prepayment: newPrepayment,
        marketingCost: parseFloat(marketingCost) || 0,
        docLink, notes,
        stage: stage || 'design',
        members: members?.length
          ? { create: members.map(m => ({ employeeId: m.employeeId, percent: parseFloat(m.percent) })) }
          : undefined,
      },
      include: { client: true, members: { include: { employee: true } }, payments: true },
    });
    if (delta > 0) {
      await autoDistribute(project.id, project.name, delta);
    }
    socket.emit('data:changed', { type: 'project' });
    socket.emit('data:changed', { type: 'employee' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.project.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'project' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Payment milestones ---

// Add payment milestone
router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, description } = req.body;
    const payment = await prisma.projectPayment.create({
      data: {
        projectId: Number(req.params.id),
        amount: parseFloat(amount) || 0,
        description,
        status: 'pending',
      },
    });
    socket.emit('data:changed', { type: 'project' });
    res.status(201).json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Mark payment as paid → auto-distribute; unpaid → reverse
router.patch('/:id/payments/:paymentId', async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const projectId = Number(req.params.id);
    const pp = await prisma.projectPayment.findUnique({ where: { id: paymentId } });
    if (!pp) return res.status(404).json({ error: 'Не найден' });

    if (req.body.status === 'paid' && pp.status === 'pending') {
      await prisma.projectPayment.update({
        where: { id: paymentId },
        data: { status: 'paid', paidAt: new Date() },
      });
      const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
      await autoDistribute(projectId, project.name, pp.amount, paymentId);

      // Update project prepayment sum
      const paidTotal = await prisma.projectPayment.aggregate({
        where: { projectId, status: 'paid' },
        _sum: { amount: true },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { prepayment: paidTotal._sum.amount || 0 },
      });
    } else if (req.body.status === 'pending' && pp.status === 'paid') {
      await prisma.projectPayment.update({
        where: { id: paymentId },
        data: { status: 'pending', paidAt: null },
      });
      // Reverse salary distributions for this payment
      await prisma.salaryPayment.deleteMany({ where: { projectPaymentId: paymentId } });

      // Recalculate project prepayment sum
      const paidTotal = await prisma.projectPayment.aggregate({
        where: { projectId, status: 'paid' },
        _sum: { amount: true },
      });
      await prisma.project.update({
        where: { id: projectId },
        data: { prepayment: paidTotal._sum.amount || 0 },
      });
    }

    socket.emit('data:changed', { type: 'project' });
    socket.emit('data:changed', { type: 'employee' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete payment milestone
router.delete('/:id/payments/:paymentId', async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const projectId = Number(req.params.id);
    await prisma.salaryPayment.deleteMany({ where: { projectPaymentId: paymentId } });
    await prisma.projectPayment.delete({ where: { id: paymentId } });

    // Recalculate prepayment
    const paidTotal = await prisma.projectPayment.aggregate({
      where: { projectId, status: 'paid' },
      _sum: { amount: true },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { prepayment: paidTotal._sum.amount || 0 },
    });

    socket.emit('data:changed', { type: 'project' });
    socket.emit('data:changed', { type: 'employee' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
