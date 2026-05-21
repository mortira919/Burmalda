const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const uploadDir = path.join(__dirname, '../../uploads/recordings');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'webm';
    cb(null, `rec_${Date.now()}.${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const recordings = await prisma.recording.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const clients = await prisma.client.findMany({ select: { id: true, name: true } });
    const leads   = await prisma.lead.findMany({ select: { id: true, name: true } });
    const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));
    const leadMap   = Object.fromEntries(leads.map(l => [l.id, l]));
    const result = recordings.map(r => ({
      ...r,
      client: r.clientId ? clientMap[r.clientId] : null,
      lead:   r.leadId   ? leadMap[r.leadId]     : null,
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    const { clientId, leadId, duration, notes } = req.body;
    const recording = await prisma.recording.create({
      data: {
        filename: req.file.filename,
        clientId: clientId ? parseInt(clientId) : null,
        leadId:   leadId   ? parseInt(leadId)   : null,
        duration: duration  ? parseInt(duration) : null,
        notes: notes || null,
      },
    });
    res.status(201).json(recording);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/file/:filename', (req, res) => {
  const filepath = path.join(uploadDir, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filepath);
});

router.patch('/:id', async (req, res) => {
  try {
    const { notes, clientId, leadId } = req.body;
    const data = {};
    if (notes !== undefined) data.notes = notes;
    if (clientId !== undefined) data.clientId = clientId ? parseInt(clientId) : null;
    if (leadId !== undefined) data.leadId = leadId ? parseInt(leadId) : null;
    const rec = await prisma.recording.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(rec);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const rec = await prisma.recording.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!rec) return res.status(404).json({ error: 'Not found' });
    const filepath = path.join(uploadDir, rec.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    await prisma.recording.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
