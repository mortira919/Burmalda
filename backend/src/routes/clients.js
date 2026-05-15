const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      include: { projects: { select: { id: true, name: true, status: true, budget: true, extraCost: true, prepayment: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.id) },
      include: { projects: { include: { transactions: true } } },
    });
    if (!client) return res.status(404).json({ error: 'Клиент не найден' });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, company, notes } = req.body;
    const client = await prisma.client.create({ data: { name, phone, email, company, notes } });
    socket.emit('data:changed', { type: 'client' });
    res.status(201).json(client);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, company, notes } = req.body;
    const client = await prisma.client.update({
      where: { id: Number(req.params.id) },
      data: { name, phone, email, company, notes },
    });
    socket.emit('data:changed', { type: 'client' });
    res.json(client);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.client.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'client' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
