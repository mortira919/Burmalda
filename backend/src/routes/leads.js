const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const socket = require('../socket');

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, company, status, notes, lastContactDate, followUpDate, tzAuthor, prepayment } = req.body;
    const lead = await prisma.lead.create({
      data: {
        name, phone, email, company,
        status: status || 'thinking',
        tzAuthor: tzAuthor || null,
        prepayment: prepayment ? parseFloat(prepayment) : null,
        notes,
        lastContactDate: lastContactDate ? new Date(lastContactDate) : null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });
    socket.emit('data:changed', { type: 'lead' });
    res.status(201).json(lead);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, company, status, notes, lastContactDate, followUpDate, tzAuthor, prepayment } = req.body;
    const lead = await prisma.lead.update({
      where: { id: Number(req.params.id) },
      data: {
        name, phone, email, company, status, notes,
        tzAuthor: tzAuthor || null,
        prepayment: prepayment ? parseFloat(prepayment) : null,
        lastContactDate: lastContactDate ? new Date(lastContactDate) : null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
      },
    });
    socket.emit('data:changed', { type: 'lead' });
    res.json(lead);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Convert lead to active client
router.post('/:id/convert', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) } });
    if (!lead) return res.status(404).json({ error: 'Лид не найден' });

    const client = await prisma.client.create({
      data: { name: lead.name, phone: lead.phone, email: lead.email, company: lead.company, notes: lead.notes },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'converted' },
    });

    socket.emit('data:changed', { type: 'lead' });
    res.json({ client });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.lead.delete({ where: { id: Number(req.params.id) } });
    socket.emit('data:changed', { type: 'lead' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
