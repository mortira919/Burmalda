const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        projectMembers: {
          include: { project: { select: { id: true, name: true, status: true, budget: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(employees);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: Number(req.params.id) },
      include: { projectMembers: { include: { project: true } } },
    });
    if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' });
    res.json(emp);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, role, defaultPercent, phone, email, notes } = req.body;
    const emp = await prisma.employee.create({
      data: { name, role, defaultPercent: parseFloat(defaultPercent) || 0, phone, email, notes },
    });
    socket.emit('data:changed', { type: 'employee' });
    res.status(201).json(emp);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, role, defaultPercent, phone, email, notes } = req.body;
    const emp = await prisma.employee.update({
      where: { id: Number(req.params.id) },
      data: { name, role, defaultPercent: parseFloat(defaultPercent) || 0, phone, email, notes },
    });
    socket.emit('data:changed', { type: 'employee' });
    res.json(emp);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.employee.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'employee' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
