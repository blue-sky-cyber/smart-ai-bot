const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { analyzeContact, generateChatReply } = require('./lib/analyzer');
const { loadStore, saveMessage, getConversation, getAllSessions, getStats } = require('./lib/storage');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;
const store = loadStore();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function broadcastToSession(sessionId, payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.sessionId === sessionId) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws, request) => {
  const url = new URL(request.url, 'http://localhost');
  ws.sessionId = url.searchParams.get('sessionId') || 'demo-session';

  ws.send(JSON.stringify({
    type: 'connected',
    sessionId: ws.sessionId,
    text: 'تم الاتصال بقناة التحديثات اللحظية عبر WebSocket'
  }));
});

app.get('/api/demo/ping', (req, res) => {
  res.json({
    ok: true,
    app: process.env.APP_NAME || 'Smart Contact AI Demo',
    message: 'الخادم يعمل بنجاح'
  });
});

app.post('/api/contact/analyze', (req, res) => {
  const payload = req.body || {};
  const sessionId = payload.sessionId || 'demo-session';
  const analysis = analyzeContact(payload, store);

  saveMessage(store, sessionId, {
    role: 'contact-form',
    type: 'analysis-input',
    content: payload.message || '',
    meta: {
      name: payload.name || '',
      email: payload.email || '',
      topic: payload.topic || ''
    }
  });

  saveMessage(store, sessionId, {
    role: 'system',
    type: 'analysis-output',
    content: JSON.stringify(analysis),
    meta: analysis
  });

  broadcastToSession(sessionId, {
    type: 'analysis_ready',
    sessionId,
    summary: analysis.summary,
    intent: analysis.intent
  });

  res.json(analysis);
});

app.post('/api/chat/send', (req, res) => {
  const { sessionId = 'demo-session', message = '' } = req.body || {};
  if (!message.trim()) {
    return res.status(400).json({ error: 'الرسالة فارغة' });
  }

  saveMessage(store, sessionId, {
    role: 'user',
    type: 'chat',
    content: message
  });

  broadcastToSession(sessionId, {
    type: 'assistant_typing',
    sessionId,
    text: 'المساعد يجهّز رداً اعتماداً على السياق والذاكرة...'
  });

  const reply = generateChatReply(sessionId, message, store);

  saveMessage(store, sessionId, {
    role: 'assistant',
    type: 'chat',
    content: reply.answer,
    meta: {
      memoriesUsed: reply.memoriesUsed,
      detectedIntent: reply.detectedIntent
    }
  });

  broadcastToSession(sessionId, {
    type: 'assistant_message',
    sessionId,
    answer: reply.answer
  });

  res.json(reply);
});

app.get('/api/chat/history/:sessionId', (req, res) => {
  const conversation = getConversation(store, req.params.sessionId);
  res.json({
    sessionId: req.params.sessionId,
    totalMessages: conversation.length,
    messages: conversation
  });
});

// ===== واجب 4: نقاط API جديدة لقاعدة بيانات SQLite =====

// جلب كل الجلسات
app.get('/api/sessions', (req, res) => {
  const sessions = getAllSessions(store);
  res.json({
    totalSessions: sessions.length,
    sessions
  });
});

// إحصاءات قاعدة البيانات
app.get('/api/db/stats', (req, res) => {
  const stats = getStats(store);
  res.json(stats);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Storage: JSON + SQLite export (data/conversations.db)`);
});
