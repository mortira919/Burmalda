const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');
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
    const { notes, clientId, leadId, transcript } = req.body;
    const data = {};
    if (notes !== undefined) data.notes = notes;
    if (transcript !== undefined) data.transcript = transcript;
    if (clientId !== undefined) data.clientId = clientId ? parseInt(clientId) : null;
    if (leadId !== undefined) data.leadId = leadId ? parseInt(leadId) : null;
    const rec = await prisma.recording.update({ where: { id: parseInt(req.params.id) }, data });
    res.json(rec);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/analyze/:id', async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(400).json({ error: 'ANTHROPIC_API_KEY не настроен на сервере' });
    }
    const { transcript } = req.body;
    if (!transcript?.trim()) return res.status(400).json({ error: 'Нет текста для анализа' });

    const rec = await prisma.recording.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!rec) return res.status(404).json({ error: 'Запись не найдена' });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Ты — ассистент менеджера IT-студии. Проанализируй транскрипцию разговора с потенциальным клиентом и извлеки ключевую информацию для составления ТЗ.

Верни ТОЛЬКО валидный JSON без markdown, без пояснений:
{
  "name": "имя или название компании клиента",
  "phone": "номер телефона если упоминался",
  "projectEssence": "суть проекта в 1-2 предложениях",
  "projectType": "тип: сайт / мобильное приложение / веб-приложение / дизайн / другое",
  "techStack": "предполагаемый стек если упоминался",
  "budget": "бюджет если упоминался",
  "deadline": "сроки если упоминались",
  "requirements": ["требование 1", "требование 2", "..."],
  "openQuestions": ["вопрос который надо уточнить 1", "..."],
  "tzDraft": "черновик ТЗ в свободной форме на основе разговора"
}

Транскрипция разговора:
${transcript}`,
      }],
    });

    const raw = message.content[0].text.trim();
    let analysis;
    try {
      analysis = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = match ? JSON.parse(match[0]) : { tzDraft: raw };
    }

    await prisma.recording.update({
      where: { id: parseInt(req.params.id) },
      data: { transcript, analysis: JSON.stringify(analysis) },
    });

    res.json({ analysis });
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
