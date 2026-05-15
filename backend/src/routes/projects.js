const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

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
        prepayment: parseFloat(prepayment) || 0,
        docLink,
        notes,
        stage: stage || 'design',
        members: members?.length
          ? {
              create: members.map(m => ({
                employeeId: m.employeeId,
                percent: parseFloat(m.percent),
              })),
            }
          : undefined,
      },
      include: { client: true, members: { include: { employee: true } } },
    });

    socket.emit('data:changed', { type: 'project' });
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, clientId, status, priority, startDate, deadline, budget, extraCost, prepayment, docLink, notes, stage, members } = req.body;
    const id = Number(req.params.id);

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
        prepayment: parseFloat(prepayment) || 0,
        docLink,
        notes,
        stage: stage || 'design',
        members: members?.length
          ? {
              create: members.map(m => ({
                employeeId: m.employeeId,
                percent: parseFloat(m.percent),
              })),
            }
          : undefined,
      },
      include: { client: true, members: { include: { employee: true } } },
    });

    socket.emit('data:changed', { type: 'project' });
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
