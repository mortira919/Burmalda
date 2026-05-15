const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

// Distributes `amount` (after tax) among project members as SalaryPayments
async function autoDistribute(projectId, projectName, amount) {
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
      },
    });
    if (!project) return res.status(404).json({ error: 'Проект не найден' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Quick patch: status or stage only
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
    const { name, clientId, status, priority, startDate, deadline, budget, extraCost, prepayment, docLink, notes, stage, members } = req.body;
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
        docLink,
        notes,
        stage: stage || 'design',
        members: members?.length
          ? { create: members.map(m => ({ employeeId: m.employeeId, percent: parseFloat(m.percent) })) }
          : undefined,
      },
      include: { client: true, members: { include: { employee: true } } },
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
    const { name, clientId, status, priority, startDate, deadline, budget, extraCost, prepayment, docLink, notes, stage, members } = req.body;
    const id = Number(req.params.id);
    const newPrepayment = parseFloat(prepayment) || 0;

    // Read old prepayment before update
    const old = await prisma.project.findUnique({ where: { id }, select: { prepayment: true } });
    const delta = newPrepayment - (old?.prepayment || 0);

    await prisma.projectEmployee.deleteMany({ where: { projectId: id } });

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        clientId: clientId ? parseInt(clientId) : null,
        status,
        priority,
        startDate: startDate ? new Date(startDate) : null,
        deadline: deadline ? new Date(deadline) : null,
        budget: parseFloat(budget) || 0,
        extraCost: parseFloat(extraCost) || 0,
        prepayment: newPrepayment,
        docLink,
        notes,
        stage: stage || 'design',
        members: members?.length
          ? { create: members.map(m => ({ employeeId: m.employeeId, percent: parseFloat(m.percent) })) }
          : undefined,
      },
      include: { client: true, members: { include: { employee: true } } },
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

module.exports = router;
