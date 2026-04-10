// نسخة تعليمية بسيطة تعمل بدون مزود AI خارجي.
// الفكرة الأساسية: نعلّم الطالب شكل التكامل بين الواجهة والخادم
// وكيف نمرّر الرسالة ونحلّلها ونرجع JSON يمكن استخدامه في UI.

const { getConversation } = require('./storage');

const NEGATIVE_WORDS = ['مشكلة', 'خطأ', 'سيء', 'غاضب', 'مستاء', 'تأخير', 'لا يعمل', 'urgent', 'complaint'];
const POSITIVE_WORDS = ['ممتاز', 'رائع', 'شكراً', 'أحسنتم', 'جميل', 'مفيد'];
const SPAM_WORDS = ['ربح سريع', 'اضغط هنا', 'crypto', 'casino', 'مليون دولار'];
const SALES_WORDS = ['سعر', 'عرض', 'اشتراك', 'شراء', 'خطة', 'تكلفة'];
const SUPPORT_WORDS = ['دعم', 'مشكلة', 'خلل', 'لا يعمل', 'bug', 'error', 'help'];
const PARTNERSHIP_WORDS = ['شراكة', 'تعاون', 'partnership', 'agency', 'integration'];
const FEEDBACK_WORDS = ['اقتراح', 'ملاحظة', 'تحسين', 'feedback'];
const URGENT_WORDS = ['عاجل', 'حالاً', 'urgent', 'asap', 'فوراً'];
const BAD_WORDS = ['غبي', 'حمار', 'stupid', 'idiot'];

// ===== واجب 1: كلمات النيات الجديدة =====
const DEMO_REQUEST_WORDS = ['تجربة', 'عرض توضيحي', 'demo', 'نسخة تجريبية', 'تجريب', 'أريد أرى', 'أشوف المنتج', 'جلسة توضيحية'];
const REFUND_WORDS = ['استرداد', 'استرجاع', 'رد المبلغ', 'refund', 'إلغاء الطلب', 'إلغاء الاشتراك', 'أريد فلوسي', 'مبلغ مسترد'];

function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function detectIntent(text) {
  if (containsAny(text, SPAM_WORDS)) return 'spam';
  // ===== واجب 1: فحص النيات الجديدة أولاً =====
  if (containsAny(text, REFUND_WORDS)) return 'refund';
  if (containsAny(text, DEMO_REQUEST_WORDS)) return 'demo-request';
  if (containsAny(text, SALES_WORDS)) return 'sales';
  if (containsAny(text, SUPPORT_WORDS)) return 'support';
  if (containsAny(text, PARTNERSHIP_WORDS)) return 'partnership';
  if (containsAny(text, FEEDBACK_WORDS)) return 'feedback';
  return 'general';
}

function detectSentiment(text) {
  let score = 0;
  if (containsAny(text, NEGATIVE_WORDS)) score -= 1;
  if (containsAny(text, POSITIVE_WORDS)) score += 1;
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function moderate(text) {
  const flags = [];
  if (containsAny(text, BAD_WORDS)) flags.push('toxic-language');
  if (containsAny(text, SPAM_WORDS)) flags.push('spam-like');
  return {
    isSafe: flags.length === 0,
    flags
  };
}

// ===== واجب 2: استخراج كيانات جديدة =====
function extractEntities(rawText = '') {
  const text = String(rawText);
  const emails = [...text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map((m) => m[0]);
  const phones = [...text.matchAll(/(?:\+?\d[\d\s-]{7,}\d)/g)].map((m) => m[0].trim());
  const urls = [...text.matchAll(/https?:\/\/[^\s]+/g)].map((m) => m[0]);
  const orderIds = [...text.matchAll(/#?[A-Z]{0,3}\d{4,}/g)].map((m) => m[0]);
  const dates = [...text.matchAll(/\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g)].map((m) => m[0]);

  const companyMatch = text.match(/(?:شركة|مؤسسة|منصة)\s+([^\n,.،]+)/);
  const personMatch = text.match(/(?:اسمي|أنا)\s+([^\n,.،]+)/);

  // ===== واجب 2: كيانات جديدة =====
  // استخراج المدينة
  const CITIES = ['الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام', 'أبوظبي', 'دبي', 'الكويت', 'عمان', 'بيروت', 'القاهرة', 'بغداد', 'الدوحة', 'المنامة', 'مسقط'];
  const cityFound = CITIES.find((city) => text.includes(city)) || null;

  // استخراج رقم الفاتورة
  const invoiceMatch = text.match(/(?:فاتورة|invoice|رقم الفاتورة|INV)[:\s#]*([A-Z0-9\-]{3,})/i);
  const invoiceId = invoiceMatch ? invoiceMatch[1].trim() : null;

  // استخراج اسم المنتج
  const productMatch = text.match(/(?:منتج|خدمة|باقة|اشتراك في|أستخدم)\s+([^\n,.،]{2,30})/);
  const product = productMatch ? productMatch[1].trim() : null;

  // استخراج الروابط الداخلية التي تحتاج متابعة (روابط غير http)
  const internalLinks = [...text.matchAll(/\/[a-zA-Z0-9\-_\/]+(?:\?[^\s]*)?/g)]
    .map((m) => m[0])
    .filter((link) => link.length > 2);

  return {
    emails,
    phones,
    urls,
    orderIds,
    dates,
    company: companyMatch ? companyMatch[1].trim() : null,
    person: personMatch ? personMatch[1].trim() : null,
    // ===== كيانات جديدة =====
    city: cityFound,
    invoiceId,
    product,
    internalLinks
  };
}

function summarize(text) {
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'لا توجد رسالة لتحليلها.';
  const sentences = cleaned.split(/[.!؟\n]/).map((s) => s.trim()).filter(Boolean);
  const summary = sentences.slice(0, 2).join(' — ');
  return summary.length > 160 ? summary.slice(0, 157) + '...' : summary;
}

function rewritePolite(name, text, intent) {
  const intro = name ? `مرحباً، أنا ${name}. ` : 'مرحباً، ';
  const byIntent = {
    support: 'أواجه مشكلة وأحتاج إلى دعم فني.',
    sales: 'أرغب بمعرفة الأسعار أو الباقات المناسبة.',
    partnership: 'أرغب بمناقشة فرصة تعاون أو تكامل.',
    feedback: 'أود مشاركة ملاحظة تساعد على تحسين الخدمة.',
    spam: 'وصلتنا رسالة تبدو تسويقية أو غير مناسبة.',
    // ===== واجب 1: إضافة النيات الجديدة =====
    'demo-request': 'أرغب في الحصول على عرض توضيحي للمنتج.',
    refund: 'أطلب استرداد المبلغ المدفوع وفق سياسة الاسترجاع.',
    general: 'أرغب بالتواصل والاستفسار.'
  };

  return `${intro}${byIntent[intent] || byIntent.general} التفاصيل: ${text.trim()}`;
}

function smartHints(intent, sentiment) {
  const hints = [];
  if (intent === 'support') hints.push('اعرض رقم تذكرة أو رابط توثيق للمشكلة.');
  if (intent === 'sales') hints.push('اقترح جدولة مكالمة تعريفية أو إرسال ملف أسعار.');
  if (intent === 'feedback') hints.push('اشكر العميل وبيّن كيف ستستخدم الملاحظة.');
  // ===== واجب 1: تلميحات للنيات الجديدة =====
  if (intent === 'demo-request') hints.push('جدوِل جلسة عرض توضيحي مع فريق المبيعات خلال 24 ساعة.');
  if (intent === 'refund') hints.push('تحقق من رقم الفاتورة وتاريخ الشراء قبل المتابعة.');
  if (sentiment === 'negative') hints.push('ابدأ الرد بتعاطف واعتذار مهني قصير.');
  if (!hints.length) hints.push('استخدم رداً مختصراً ثم أضف سؤال متابعة واضح.');
  return hints;
}

// ===== واجب 1: تحديث suggestedReply لدعم النيات الجديدة =====
function suggestReply(name, intent, sentiment, entities) {
  const greeting = name ? `مرحباً ${name}` : 'مرحباً';
  const empathy = sentiment === 'negative' ? 'نعتذر عن الإزعاج ونقدّر توضيحك.' : 'شكراً لتواصلك معنا.';
  const intentText = {
    support: 'سنراجع المشكلة ونعود إليك بخطوات واضحة للحل.',
    sales: 'يسعدنا تزويدك بالخطة المناسبة بحسب احتياجك.',
    partnership: 'يسعدنا مناقشة فكرة التعاون والتكامل المقترحة.',
    feedback: 'نقدّر ملاحظتك وسنحوّلها للفريق المختص.',
    spam: 'لا يمكننا متابعة هذا النوع من الرسائل.',
    // ===== واجب 1: ردود النيات الجديدة =====
    'demo-request': 'يسعدنا ترتيب جلسة عرض توضيحي مخصصة لك. سيتواصل معك أحد المختصين خلال 24 ساعة لتحديد الموعد المناسب.',
    refund: 'سنراجع طلب الاسترداد الخاص بك وفق سياستنا. يرجى تزويدنا برقم الفاتورة لتسريع المعالجة.',
    general: 'يسعدنا مساعدتك وتوجيهك للخطوة التالية.'
  };

  const entityLines = [];
  if (entities.orderIds.length) entityLines.push(`رقم الطلب: ${entities.orderIds[0]}.`);
  if (entities.emails.length) entityLines.push(`البريد المذكور: ${entities.emails[0]}.`);
  // ===== واجب 2: إضافة الكيانات الجديدة في الرد المقترح =====
  if (entities.invoiceId) entityLines.push(`رقم الفاتورة: ${entities.invoiceId}.`);
  if (entities.city) entityLines.push(`المدينة: ${entities.city}.`);
  if (entities.product) entityLines.push(`المنتج/الخدمة: ${entities.product}.`);

  const entityLine = entityLines.join(' ');

  return `${greeting}، ${empathy} ${intentText[intent] || intentText.general} ${entityLine}`.trim();
}

function buildSeoSuggestions(text) {
  const keywords = normalize(text)
    .split(/[^a-zA-Z\u0600-\u06FF0-9]+/)
    .filter((x) => x.length > 3)
    .slice(0, 6);

  return {
    titleIdea: `حل سريع لـ ${keywords[0] || 'استفسار العميل'} | دليل مبسّط`,
    metaDescription: `ملخص قصير يشرح المشكلة أو الطلب ويقترح استجابة عملية خلال أقل من دقيقة.`,
    faqIdeas: [
      'ما الخطوة الأولى بعد إرسال النموذج؟',
      'كيف يتم تصنيف الطلبات تلقائياً؟',
      'متى يجب تحويل الطلب إلى الدعم البشري؟'
    ],
    targetKeywords: keywords
  };
}

function shouldEscalate(intent, sentiment, moderationResult, text) {
  return (
    intent === 'support' ||
    intent === 'refund' ||   // ===== واجب 1: طلبات الاسترداد تحتاج تصعيد =====
    sentiment === 'negative' ||
    !moderationResult.isSafe ||
    containsAny(text, URGENT_WORDS)
  );
}

function analyzeContact(payload, store) {
  const name = (payload.name || '').trim();
  const email = (payload.email || '').trim();
  const message = (payload.message || '').trim();
  const topic = (payload.topic || '').trim();
  const text = normalize(`${topic} ${message}`);
  const intent = detectIntent(text);
  const sentiment = detectSentiment(text);
  const moderationResult = moderate(text);
  const entities = extractEntities(`${name}\n${email}\n${topic}\n${message}`);
  const summary = summarize(message);

  return {
    name,
    email,
    topic,
    summary,
    intent,
    sentiment,
    moderation: moderationResult,
    entities,
    rewrittenMessage: rewritePolite(name, message, intent),
    suggestedReply: suggestReply(name, intent, sentiment, entities),
    smartHints: smartHints(intent, sentiment),
    seo: buildSeoSuggestions(message),
    shouldEscalate: shouldEscalate(intent, sentiment, moderationResult, text),
    confidence: intent === 'general' ? 0.61 : 0.84
  };
}

function textToKeywordSet(text = '') {
  return new Set(
    normalize(text)
      .split(/[^a-zA-Z\u0600-\u06FF0-9]+/)
      .filter((w) => w.length > 2)
  );
}

function scoreSimilarity(a, b) {
  const setA = textToKeywordSet(a);
  const setB = textToKeywordSet(b);
  let overlap = 0;
  setA.forEach((word) => {
    if (setB.has(word)) overlap += 1;
  });
  return overlap;
}

function retrieveMemories(sessionId, message, store) {
  const conversation = getConversation(store, sessionId);
  return conversation
    .filter((item) => ['user', 'contact-form'].includes(item.role))
    .map((item) => ({
      content: item.content,
      score: scoreSimilarity(item.content, message)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function generateChatReply(sessionId, message, store) {
  const normalized = normalize(message);
  const detectedIntent = detectIntent(normalized);
  const memories = retrieveMemories(sessionId, message, store);
  const conversation = getConversation(store, sessionId);
  const lastAssistant = [...conversation].reverse().find((item) => item.role === 'assistant');

  const memoryBlock = memories.length
    ? `استناداً إلى الذاكرة السابقة: ${memories.map((m) => m.content.slice(0, 40)).join(' | ')}.`
    : 'لا توجد ذاكرة سابقة قوية لهذه الرسالة.';

  const followUp = lastAssistant
    ? `آخر رد مساعد كان: "${lastAssistant.content.slice(0, 50)}..." .`
    : 'هذه أول جولة تقريباً داخل الجلسة.';

  const answerByIntent = {
    support: 'أقترح أن نبدأ بتحديد الخطأ الظاهر، وقت حدوثه، وخطوات إعادة المشكلة.',
    sales: 'يمكنني تلخيص المزايا ثم اقتراح الباقة الأقرب لاحتياج العميل.',
    partnership: 'لنرتب الفكرة في نقاط: الهدف، الجمهور، طريقة الربط، والفائدة المتوقعة.',
    feedback: 'سأحوّل الملاحظة إلى صياغة أوضح مع اقتراح تنفيذ عملي.',
    spam: 'هذه الرسالة تبدو غير مناسبة لقناة التواصل، والأفضل تجاهلها أو حظرها.',
    // ===== واجب 1: ردود الدردشة للنيات الجديدة =====
    'demo-request': 'يسعدنا ترتيب عرض توضيحي. سأحتاج منك تحديد التاريخ والوقت المناسب لك.',
    refund: 'لمعالجة طلب الاسترداد، أحتاج رقم الفاتورة وتاريخ الشراء. هل يمكنك تزويدي بهما؟',
    general: 'سأعطيك رداً واضحاً ومختصراً ثم سؤال متابعة يساعدك على الاستكمال.'
  };

  const answer =
    `تحليل سريع: الرسالة أقرب إلى فئة "${detectedIntent}". ` +
    `${answerByIntent[detectedIntent] || answerByIntent.general} ` +
    `${memoryBlock} ${followUp} ` +
    `الرد المقترح: شكراً لتوضيحك، هل يمكنك تزويدنا بتفصيل إضافي واحد يساعدنا على المتابعة؟`;

  return {
    answer,
    detectedIntent,
    memoriesUsed: memories,
    historyCount: conversation.length + 1
  };
}

module.exports = {
  analyzeContact,
  generateChatReply
};
