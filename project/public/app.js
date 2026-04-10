const sessionId = 'lesson-unit-4';
const analysisOutput = document.getElementById('analysisOutput');
const historyOutput = document.getElementById('historyOutput');
const wsLog = document.getElementById('wsLog');
const chatMessages = document.getElementById('chatMessages');
const pingStatus = document.getElementById('pingStatus');

// ===== واجب 3: مراجع عناصر الرد المقترح والتذكرة =====
const suggestedReplyCard = document.getElementById('suggestedReplyCard');
const suggestedReplyText = document.getElementById('suggestedReplyText');
const copyReplyBtn = document.getElementById('copyReplyBtn');
const openTicketBtn = document.getElementById('openTicketBtn');
const copyFeedback = document.getElementById('copyFeedback');
const entitiesCard = document.getElementById('entitiesCard');
const entitiesList = document.getElementById('entitiesList');
const ticketCard = document.getElementById('ticketCard');
const ticketContent = document.getElementById('ticketContent');
const closeTicketBtn = document.getElementById('closeTicketBtn');

// متغير لحفظ آخر نتيجة تحليل
let lastAnalysisResult = null;

function addBubble(role, text, shouldPersist = true) {
  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatMessages.prepend(div);
  if (shouldPersist) persistBubble(role, text);
}

function persistBubble(role, text) {
  const current = JSON.parse(localStorage.getItem('unit4-chat-ui') || '[]');
  current.unshift({ role, text });
  localStorage.setItem('unit4-chat-ui', JSON.stringify(current.slice(0, 20)));
}

function restoreBubbles() {
  const current = JSON.parse(localStorage.getItem('unit4-chat-ui') || '[]');
  current.slice().reverse().forEach((item) => addBubble(item.role, item.text, false));
}

async function callApi(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

// ===== واجب 3: دالة عرض الكيانات المستخرجة =====
function renderEntities(entities) {
  if (!entities) return;

  const items = [];

  if (entities.emails && entities.emails.length) {
    items.push({ label: '📧 البريد الإلكتروني', value: entities.emails.join(', ') });
  }
  if (entities.phones && entities.phones.length) {
    items.push({ label: '📞 الهاتف', value: entities.phones.join(', ') });
  }
  if (entities.orderIds && entities.orderIds.length) {
    items.push({ label: '🔢 رقم الطلب', value: entities.orderIds.join(', ') });
  }
  if (entities.dates && entities.dates.length) {
    items.push({ label: '📅 التاريخ', value: entities.dates.join(', ') });
  }
  if (entities.company) {
    items.push({ label: '🏢 الشركة', value: entities.company });
  }
  if (entities.person) {
    items.push({ label: '👤 الشخص', value: entities.person });
  }
  // ===== واجب 2: عرض الكيانات الجديدة =====
  if (entities.city) {
    items.push({ label: '🏙️ المدينة', value: entities.city });
  }
  if (entities.invoiceId) {
    items.push({ label: '🧾 رقم الفاتورة', value: entities.invoiceId });
  }
  if (entities.product) {
    items.push({ label: '📦 المنتج/الخدمة', value: entities.product });
  }
  if (entities.internalLinks && entities.internalLinks.length) {
    items.push({ label: '🔗 روابط داخلية', value: entities.internalLinks.join(', ') });
  }
  if (entities.urls && entities.urls.length) {
    items.push({ label: '🌐 روابط خارجية', value: entities.urls.join(', ') });
  }

  if (items.length === 0) {
    entitiesCard.style.display = 'none';
    return;
  }

  entitiesList.innerHTML = items.map((item) =>
    `<div class="entity-item"><span class="entity-label">${item.label}:</span> <span class="entity-value">${item.value}</span></div>`
  ).join('');

  entitiesCard.style.display = 'block';
}

// ===== واجب 3: دالة فتح تذكرة الدعم =====
function openTicket(result) {
  const ticketId = 'TKT-' + Date.now().toString().slice(-6);
  const now = new Date().toLocaleString('ar-SA');

  const intentLabels = {
    support: 'دعم فني',
    sales: 'مبيعات',
    partnership: 'شراكة',
    feedback: 'ملاحظة',
    spam: 'بريد مزعج',
    'demo-request': 'طلب عرض توضيحي',
    refund: 'طلب استرداد',
    general: 'عام'
  };

  const priorityLabel = result.shouldEscalate ? '🔴 عالية' : '🟡 متوسطة';
  const intentLabel = intentLabels[result.intent] || result.intent;

  ticketContent.innerHTML = `
    <div class="ticket-row"><strong>رقم التذكرة:</strong> ${ticketId}</div>
    <div class="ticket-row"><strong>التاريخ:</strong> ${now}</div>
    <div class="ticket-row"><strong>الاسم:</strong> ${result.name || 'غير محدد'}</div>
    <div class="ticket-row"><strong>البريد:</strong> ${result.email || 'غير محدد'}</div>
    <div class="ticket-row"><strong>الموضوع:</strong> ${result.topic || 'غير محدد'}</div>
    <div class="ticket-row"><strong>النية:</strong> ${intentLabel}</div>
    <div class="ticket-row"><strong>الأولوية:</strong> ${priorityLabel}</div>
    <div class="ticket-row"><strong>الملخص:</strong> ${result.summary}</div>
    <div class="ticket-row"><strong>الرد المقترح:</strong> ${result.suggestedReply}</div>
  `;

  ticketCard.style.display = 'block';
  ticketCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.getElementById('pingBtn').addEventListener('click', async () => {
  try {
    const data = await callApi('/api/demo/ping');
    pingStatus.textContent = data.message;
  } catch (error) {
    pingStatus.textContent = 'فشل الاتصال بالخادم';
  }
});

document.getElementById('contactForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    sessionId,
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    topic: document.getElementById('topic').value,
    message: document.getElementById('message').value
  };

  try {
    const result = await callApi('/api/contact/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    lastAnalysisResult = result;
    analysisOutput.textContent = JSON.stringify(result, null, 2);

    // ===== واجب 3: عرض بطاقة الرد المقترح =====
    if (result.suggestedReply) {
      suggestedReplyText.textContent = result.suggestedReply;
      suggestedReplyCard.style.display = 'block';
      copyFeedback.style.display = 'none';
    }

    // ===== واجب 2: عرض الكيانات المستخرجة =====
    renderEntities(result.entities);

    // إخفاء تذكرة قديمة عند تحليل جديد
    ticketCard.style.display = 'none';

    addBubble('assistant', `تم تحليل الرسالة. النية: ${result.intent} — الملخص: ${result.summary}`);
  } catch (error) {
    analysisOutput.textContent = `حدث خطأ: ${error.message}`;
  }
});

// ===== واجب 3: زر نسخ الرد المقترح =====
copyReplyBtn.addEventListener('click', () => {
  const replyText = suggestedReplyText.textContent;
  if (!replyText) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(replyText).then(() => {
      copyFeedback.style.display = 'block';
      setTimeout(() => { copyFeedback.style.display = 'none'; }, 2500);
    }).catch(() => {
      fallbackCopy(replyText);
    });
  } else {
    fallbackCopy(replyText);
  }
});

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  copyFeedback.style.display = 'block';
  setTimeout(() => { copyFeedback.style.display = 'none'; }, 2500);
}

// ===== واجب 3: زر فتح تذكرة الدعم =====
openTicketBtn.addEventListener('click', () => {
  if (lastAnalysisResult) {
    openTicket(lastAnalysisResult);
  }
});

// ===== واجب 3: زر إغلاق التذكرة =====
closeTicketBtn.addEventListener('click', () => {
  ticketCard.style.display = 'none';
});

document.getElementById('chatForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  addBubble('user', message);
  input.value = '';

  try {
    const result = await callApi('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ sessionId, message })
    });

    addBubble('assistant', result.answer);
  } catch (error) {
    addBubble('assistant', `تعذر إرسال الرسالة: ${error.message}`);
  }
});

document.getElementById('historyBtn').addEventListener('click', async () => {
  try {
    const history = await callApi(`/api/chat/history/${sessionId}`);
    historyOutput.textContent = JSON.stringify(history, null, 2);
  } catch (error) {
    historyOutput.textContent = `تعذر جلب السجل: ${error.message}`;
  }
});

const socket = new WebSocket(`${location.origin.replace('http', 'ws')}?sessionId=${sessionId}`);

socket.addEventListener('open', () => {
  wsLog.textContent = 'تم فتح اتصال WebSocket بنجاح.';
});

socket.addEventListener('message', (event) => {
  try {
    const payload = JSON.parse(event.data);
    if (payload.type === 'assistant_typing') {
      wsLog.textContent = payload.text;
    } else if (payload.type === 'assistant_message') {
      wsLog.textContent = 'وصل رد جديد عبر التحديثات اللحظية.';
    } else if (payload.type === 'analysis_ready') {
      wsLog.textContent = `التحليل جاهز: ${payload.intent}`;
    } else if (payload.type === 'connected') {
      wsLog.textContent = payload.text;
    }
  } catch (error) {
    wsLog.textContent = 'وصلت رسالة غير قابلة للتحليل.';
  }
});

restoreBubbles();
