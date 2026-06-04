import express from 'express';
import cors from 'cors';
import { initDB, createAppointment, getAppointments, getAvailableSlots, saveConversation } from './db.js';
import { AgentBot } from './agent.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = initDB('./hermanos.db');
const dbHelpers = { createAppointment, getAvailableSlots };
const agent = new AgentBot(dbHelpers);

app.use(express.static('../frontend'));

app.post('/api/chat', (req, res) => {
  const { message, visitorId } = req.body;
  if (!message || !visitorId) return res.status(400).json({ error: 'Missing message or visitorId' });
  const response = agent.processMessage(visitorId, message, db);
  const session = agent.getSession(visitorId);
  const messages = session.context._messages || [];
  messages.push({ role: 'user', content: message });
  messages.push({ role: 'bot', content: response.text });
  session.context._messages = messages;
  saveConversation(db, visitorId, messages);
  res.json(response);
});

app.get('/api/appointments', (req, res) => {
  const { date } = req.query;
  res.json(getAppointments(db, date || null));
});

app.get('/api/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date required (YYYY-MM-DD)' });
  res.json({ date, availableSlots: getAvailableSlots(db, date) });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: "Hermano's Fade Barbershop AI Agent", version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`🤖 Hermano's Fade AI Agent running on port ${PORT}`);
});
