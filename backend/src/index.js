require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const socket = require('./socket');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const clientRoutes = require('./routes/clients');
const leadRoutes = require('./routes/leads');
const employeeRoutes = require('./routes/employees');
const financeRoutes = require('./routes/finance');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

const app = express();
const server = http.createServer(app);
socket.init(server);

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

server.listen(PORT, () => {
  console.log(`CRM Server running on http://localhost:${PORT}`);
});
