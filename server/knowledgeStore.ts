import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import mammoth from 'mammoth';
import path from 'path';
import type {
  AuditLogItem,
  BotConfig,
  BotType,
  ChatMessageItem,
  ConversationSummary,
  EscalationItem,
  KnowledgeDoc,
  SupportConfig,
  TrainingQuestion,
  UserProfile,
} from '../src/types/platform';
import { INITIAL_CRM_TRAINING_100, INITIAL_WEBSITE_TRAINING_QA } from './crmTraining100';

export interface KnowledgeChunk {
  id: string;
  docId: string;
  docTitle: string;
  category: string;
  botType: BotType;
  text: string;
  embedding?: number[];
}

export interface UsageStats {
  websiteTokens: number;
  crmTokens: number;
  websiteRequests: number;
  crmRequests: number;
  dailySeries: Array<{ date: string; website: number; crm: number }>;
  topQuestions: Array<{ question: string; botType: BotType; count: number }>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'platform-store.json');
const NOW = '2026-11-24T09:00:00.000Z';

const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  companyName: 'NMD Pvt Ltd · Sustain & Save Support',
  supportPhone: process.env.SUPPORT_PHONE || '+91 8830498811',
  whatsappNumber: process.env.SUPPORT_WHATSAPP || '918830498811',
  supportEmail: process.env.SUPPORT_EMAIL || 'nmdpvtltd@gmail.com',
  headOffice:
    'Office No.11, Second Floor, NMD PVT LTD, Aditya Centeegra, Fergusson College Rd, Shivajinagar, Pune, Maharashtra 411004',
  branchOffice:
    'Office No.202, Mantri House, Fergusson College Rd, Shivajinagar, Pune, Maharashtra 411005',
  contactUrl: 'https://thedigitalnmd.com/contact',
  updatedAt: NOW,
};

const DEFAULT_BOT_CONFIGS: Record<BotType, BotConfig> = {
  website: {
    botType: 'website',
    botName: 'Sustain & Save Assistant',
    welcomeMessage:
      'Welcome to Sustain & Save! Ask me about our energy monitoring hardware, sustainability programs, business policies, pricing, or support.',
    systemInstructions:
      'You are the official Sustain & Save Website AI Assistant. Answer strictly using the approved Website Knowledge Base and approved Website Q&A training pairs provided in context. Never guess, never invent prices or policies, and never mention internal CRM records. If the context does not answer the question, explicitly state that you need to connect the visitor with Support.',
    model: 'gemini-4-hydrogen',
    temperature: 0.2,
    maxResponseLength: 900,
    knowledgeBaseId: 'website_kb_primary',
    enabled: true,
    suggestedQuestions: [
      'What does Sustain & Save do?',
      'Compare your sustainability plans and savings',
      'What is your EM-100 hardware warranty and SLA?',
      'How can I contact NMD Pvt Ltd support?',
    ],
    updatedAt: NOW,
  },
  crm: {
    botType: 'crm',
    botName: 'Sustain & Save CRM Copilot',
    welcomeMessage:
      'Welcome to the internal CRM AI Assistant. Ask read-only questions about leads, customers, follow-ups, support tickets, SOPs, or CRM workflows.',
    systemInstructions:
      'You are the internal Sustain & Save CRM AI Assistant. You operate in strict READ-ONLY mode. Only cite numbers returned by the verified CRM data query or retrieved CRM SOP documents. Never invent statistics, never modify or delete records, and never expose private CRM data externally.',
    model: 'gemini-4-hydrogen',
    temperature: 0.1,
    maxResponseLength: 1200,
    knowledgeBaseId: 'crm_kb_primary',
    crmDataMode: 'demo_ro',
    enabled: true,
    suggestedQuestions: [
      "Show this month's leads by source.",
      'How many customers registered this month?',
      'Which leads require follow-up?',
      'Show pending support tickets.',
      'Generate a monthly performance report.',
      'Explain how to use the Lead Management module.',
    ],
    updatedAt: NOW,
  },
};

const SEED_WEBSITE_DOCS: KnowledgeDoc[] = [
  {
    id: 'web-doc-001',
    botType: 'website',
    title: 'Sustain & Save Company Profile & Offerings',
    category: 'Company Profile',
    sourceType: 'custom',
    content: `Sustain & Save partners with manufacturing plants, cold-chain facilities, commercial campuses, and healthcare labs across India to cut energy waste and meet ESG targets.
Core Products & Services:
1. EM-100 Industrial Energy Monitor: Real-time 3-phase power quality, kWh, and peak-demand telemetry unit with 24-month hardware warranty and automated threshold alerts.
2. Solar & Power-Quality Audits: On-site engineering assessment identifying harmonic distortion, capacitor bank tuning, and rooftop solar ROI. Typical industrial facilities achieve 12% to 18% electricity savings within 6 months.
3. Sustainable Packaging & Zero-Waste Advisory: Recyclable corrugated transit packaging conversion and material lifecycle audits.
4. Automated ESG & BRSR Reporting: Monthly Scope 2 tCO2e emission tracking and ISO 14001 audit-ready PDF exports.
Plans & Pricing (INR):
- Starter Energy Audit: ₹69,998/year (1 EM-100 unit, baseline audit, quarterly savings review).
- Growth Sustainability: ₹1,25,000/year (multi-meter telemetry, automated carbon dashboards, bi-monthly advisory).
- Enterprise Net-Zero: ₹2,40,000/year (plant-wide IoT metering, ISO 14001 / BRSR exports, dedicated account manager).`,
    chunkCount: 2,
    active: true,
    processingStatus: 'indexed',
    hasEmbeddings: false,
    createdBy: 'system-seed',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'web-doc-002',
    botType: 'website',
    title: 'Support Policy, SLA & NMD Pvt Ltd Contact Directory',
    category: 'Business Policies',
    sourceType: 'custom',
    content: `Customer Support & Escalation Policy:
- Support Hours: 24/7 AI Chatbot assistance with live engineering escalation during business hours (Mon–Sat, 9:30 AM – 7:00 PM IST) and emergency telemetry coverage for Enterprise Net-Zero accounts.
- Onboarding Timeline: Standard EM-100 hardware dispatch and portal provisioning complete within 7 business days of PO confirmation.
- Warranty & AMC: EM-100 monitors carry a 24-month replacement warranty under active Annual Maintenance Contract (AMC).
- SLA Response Windows: High priority (plant gateway offline) = 2 hours; Medium priority = 12 hours; Low priority / Portal Access = 24 hours.
Official Support & Implementation Partner (NMD Pvt Ltd):
- Phone / Call Support: +91 8830498811
- WhatsApp Support: +91 8830498811
- Email: nmdpvtltd@gmail.com
- Contact Portal: https://thedigitalnmd.com/contact
- Head Office (Pune): Office No.11, Second Floor, NMD PVT LTD, Aditya Centeegra, Fergusson College Rd, Shivajinagar, Pune, Maharashtra 411004
- Branch Office (Pune): Office No.202, Mantri House, Fergusson College Rd, Shivajinagar, Pune, Maharashtra 411005`,
    chunkCount: 2,
    active: true,
    processingStatus: 'indexed',
    hasEmbeddings: false,
    createdBy: 'system-seed',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'web-doc-003',
    botType: 'website',
    title: 'Dual AI Chatbot Solution Quotation Summary (NMD/QT/2026/103)',
    category: 'FAQs',
    sourceType: 'custom',
    content: `AI Chatbot Platform Architecture (Quotation NMD/QT/2026/103 by NMD Pvt Ltd):
- Bot 1 (Website Frontend Bot): Public-facing 24x7 customer assistant trained strictly on approved company content, FAQs, policies, and website documents. Includes Smart Escalation to Call/WhatsApp when a question is outside training.
- Bot 2 (CRM Backend Bot): Internal employee assistant with Role-Based Access Control (RBAC), read-only live CRM queries, Recharts pie/bar visual reports, and 100 initial training questions.
- Commercial Summary: Bot Development & Training ₹23,998 one-time (₹11,999 per bot); AI Usage / API Key ₹30,000/year (1M tokens per bot); Annual Maintenance (AMC) ₹16,000/year (₹8,000 per bot). First Year Total Payable: ₹69,998. Yearly Renewal from Year 2: ₹46,000.`,
    chunkCount: 1,
    active: true,
    processingStatus: 'indexed',
    hasEmbeddings: false,
    createdBy: 'system-seed',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const SEED_CRM_DOCS: KnowledgeDoc[] = [
  {
    id: 'crm-doc-001',
    botType: 'crm',
    title: 'CRM User Guide — Lead Management & Pipeline Stages',
    category: 'CRM User Guide',
    sourceType: 'custom',
    content: `Lead Management Module User Guide:
1. Accessing Leads: Navigate to CRM Workspace > Data Explorer > Leads tab. Records are read-only inside the AI Copilot.
2. Pipeline Stages: New -> Qualified -> Proposal Sent -> Negotiation -> Won / Lost.
3. Qualification Rules: Confirm facility energy load, sustainability scope (EM-100, Solar Audit, Net-Zero), decision-maker contact, and target implementation timeline before moving a lead to Qualified.
4. Response SLA: Inbound Website Chatbot leads must receive outreach within 4 business hours.
5. Role Scope: CRM Employees view leads assigned to their owner name; CRM Admins and Super Admins view organization-wide pipeline metrics.`,
    chunkCount: 1,
    active: true,
    processingStatus: 'indexed',
    hasEmbeddings: false,
    createdBy: 'system-seed',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'crm-doc-002',
    botType: 'crm',
    title: 'Internal SOP — Customer Follow-Ups & Support Ticket Escalations',
    category: 'Internal SOPs',
    sourceType: 'custom',
    content: `Follow-Up & Ticket Handling SOP:
- Daily Follow-Up Cadence: Clear Overdue follow-ups before 11:00 AM IST each day. High-priority follow-ups must never breach 24 hours overdue.
- Escalation Rule: After 3 unanswered outreach attempts or when a client requests custom commercial terms (>10% discount), escalate to CRM Admin.
- Ticket SLAs: High priority (Hardware Telemetry outage) = 2h response / 4h triage; Medium priority (ESG Reporting / Billing) = 12h; Low priority (Portal Access) = 24h.
- Read-Only AI Policy: Bot 2 cannot edit, close, or delete CRM leads, customers, follow-ups, or tickets. All state changes must be performed in the primary CRM system.`,
    chunkCount: 1,
    active: true,
    processingStatus: 'indexed',
    hasEmbeddings: false,
    createdBy: 'system-seed',
    createdAt: NOW,
    updatedAt: NOW,
  },
];

interface PersistedState {
  supportConfig: SupportConfig;
  botConfigs: Record<BotType, BotConfig>;
  websiteDocs: KnowledgeDoc[];
  crmDocs: KnowledgeDoc[];
  trainingQuestions: TrainingQuestion[];
  conversations: ConversationSummary[];
  escalations: EscalationItem[];
  auditLogs: AuditLogItem[];
  users: UserProfile[];
  usage: UsageStats;
}

function createInitialState(): PersistedState {
  const sampleConversations: ConversationSummary[] = [
    {
      id: 'conv-web-demo-001',
      ownerId: 'visitor-session-01',
      ownerLabel: 'Public Website Visitor',
      botType: 'website',
      title: 'EM-100 pricing & warranty inquiry',
      status: 'active',
      unansweredCount: 0,
      messageCount: 2,
      lastMessagePreview: 'Starter Energy Audit starts at ₹69,998/year and EM-100 carries a 24-month warranty.',
      createdAt: '2026-11-24T07:15:00.000Z',
      updatedAt: '2026-11-24T07:16:00.000Z',
      messages: [
        {
          id: 'm1',
          conversationId: 'conv-web-demo-001',
          botType: 'website',
          sender: 'user',
          text: 'What is the pricing and warranty for EM-100 energy monitoring?',
          timestamp: '2026-11-24T07:15:00.000Z',
          feedback: 'none',
        },
        {
          id: 'm2',
          conversationId: 'conv-web-demo-001',
          botType: 'website',
          sender: 'assistant',
          text: 'Starter Energy Audit starts at ₹69,998/year (including 1 EM-100 monitor), and all EM-100 monitors carry a 24-month hardware warranty under active AMC.',
          timestamp: '2026-11-24T07:16:00.000Z',
          sourceRefs: ['Sustain & Save Company Profile & Offerings'],
          feedback: 'up',
        },
      ],
    },
    {
      id: 'conv-crm-demo-001',
      ownerId: 'crm-staff-seed',
      ownerLabel: 'Aarav Kulkarni (CRM Employee)',
      botType: 'crm',
      title: 'Monthly lead source analysis',
      status: 'active',
      unansweredCount: 0,
      messageCount: 2,
      lastMessagePreview: '[DEMO DATA] Computed 22 November 2026 leads across 6 acquisition sources.',
      createdAt: '2026-11-24T08:10:00.000Z',
      updatedAt: '2026-11-24T08:11:00.000Z',
      messages: [
        {
          id: 'm3',
          conversationId: 'conv-crm-demo-001',
          botType: 'crm',
          sender: 'user',
          text: "Show this month's leads by source.",
          timestamp: '2026-11-24T08:10:00.000Z',
          feedback: 'none',
        },
        {
          id: 'm4',
          conversationId: 'conv-crm-demo-001',
          botType: 'crm',
          sender: 'assistant',
          text: '[DEMO DATA] November 2026 recorded 22 leads across Website Chatbot, LinkedIn, Organic Search, Referral, Trade Expo, and Direct Inquiry.',
          timestamp: '2026-11-24T08:11:00.000Z',
          sourceRefs: ['CRM Read-Only Lead Analytics (DEMO)'],
          feedback: 'up',
          isDemoData: true,
        },
      ],
    },
  ];

  const sampleEscalations: EscalationItem[] = [
    {
      id: 'esc-001',
      ownerId: 'visitor-session-02',
      ownerLabel: 'Public Website Visitor',
      botType: 'website',
      conversationId: 'conv-web-demo-001',
      question: 'Can Sustain & Save integrate custom Siemens S7 PLC Modbus registers for our Pune unit?',
      channel: 'whatsapp',
      status: 'open',
      notes: 'Requires engineering feasibility review via NMD Pvt Ltd / Sustain & Save technical desk.',
      createdAt: '2026-11-24T08:30:00.000Z',
      updatedAt: '2026-11-24T08:30:00.000Z',
    },
  ];

  const seedUsers: UserProfile[] = [
    {
      uid: 'super-admin-primary',
      displayName: 'Prachia Mahajan',
      email: 'prachiamahajan192008@gmail.com',
      role: 'SUPER_ADMIN',
      department: 'Executive & AI Governance',
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      uid: 'nmd-crm-admin',
      displayName: 'NMD Support Lead',
      email: 'nmdpvtltd@gmail.com',
      role: 'CRM_ADMIN',
      department: 'CRM Operations',
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      uid: 'crm-emp-aarav',
      displayName: 'Aarav Kulkarni',
      email: 'aarav.k@sustainandsave.demo',
      role: 'CRM_EMPLOYEE',
      department: 'Enterprise Sales',
      status: 'active',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];

  return {
    supportConfig: DEFAULT_SUPPORT_CONFIG,
    botConfigs: DEFAULT_BOT_CONFIGS,
    websiteDocs: SEED_WEBSITE_DOCS,
    crmDocs: SEED_CRM_DOCS,
    trainingQuestions: [...INITIAL_CRM_TRAINING_100, ...INITIAL_WEBSITE_TRAINING_QA],
    conversations: sampleConversations,
    escalations: sampleEscalations,
    auditLogs: [
      {
        id: 'audit-001',
        actorUid: 'system-seed',
        actorLabel: 'System Provisioner',
        action: 'PLATFORM_INITIALIZED',
        target: 'Sustain & Save Dual AI Platform',
        detail: 'Seeded isolated Website & CRM Knowledge Bases, 100 CRM Q&A training set, and NMD Pvt Ltd support channels.',
        createdAt: NOW,
      },
    ],
    users: seedUsers,
    usage: {
      websiteTokens: 18420,
      crmTokens: 24910,
      websiteRequests: 42,
      crmRequests: 38,
      dailySeries: [
        { date: 'Nov 19', website: 14, crm: 9 },
        { date: 'Nov 20', website: 18, crm: 12 },
        { date: 'Nov 21', website: 22, crm: 15 },
        { date: 'Nov 22', website: 19, crm: 18 },
        { date: 'Nov 23', website: 27, crm: 21 },
        { date: 'Nov 24', website: 31, crm: 24 },
      ],
      topQuestions: [
        { question: "Show this month's leads by source.", botType: 'crm', count: 14 },
        { question: 'What plans do you offer?', botType: 'website', count: 19 },
        { question: 'Show pending support tickets.', botType: 'crm', count: 11 },
        { question: 'How can I contact NMD Pvt Ltd support?', botType: 'website', count: 12 },
      ],
    },
  };
}

class PlatformKnowledgeStore {
  private state: PersistedState;
  private chunks: Record<BotType, KnowledgeChunk[]> = { website: [], crm: [] };

  constructor() {
    this.state = this.loadState();
    this.rebuildChunks('website');
    this.rebuildChunks('crm');
  }

  private loadState(): PersistedState {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8')) as PersistedState;
        return raw;
      }
    } catch {
      // fall through to seed
    }
    const seeded = createInitialState();
    this.saveState(seeded);
    return seeded;
  }

  private saveState(target = this.state) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(target, null, 2), 'utf-8');
    } catch {
      // non-fatal if filesystem is read-only
    }
  }

  public chunkText(text: string, maxChars = 750, overlap = 120): string[] {
    const clean = text.replace(/\r\n/g, '\n').trim();
    if (!clean) return [];
    if (clean.length <= maxChars) return [clean];
    const chunks: string[] = [];
    let start = 0;
    while (start < clean.length) {
      const end = Math.min(clean.length, start + maxChars);
      chunks.push(clean.slice(start, end).trim());
      if (end >= clean.length) break;
      start = Math.max(0, end - overlap);
    }
    return chunks;
  }

  private rebuildChunks(botType: BotType) {
    const docs = botType === 'website' ? this.state.websiteDocs : this.state.crmDocs;
    const nextChunks: KnowledgeChunk[] = [];
    for (const doc of docs) {
      if (!doc.active) continue;
      const parts = this.chunkText(doc.content);
      parts.forEach((part, idx) => {
        nextChunks.push({
          id: `${doc.id}-c${idx}`,
          docId: doc.id,
          docTitle: doc.title,
          category: doc.category,
          botType,
          text: part,
        });
      });
    }
    this.chunks[botType] = nextChunks;
  }

  public async extractFileText(
    fileName: string,
    mimeType: string,
    base64Data: string
  ): Promise<string> {
    const lower = fileName.toLowerCase();
    const buffer = Buffer.from(base64Data, 'base64');

    if (lower.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }

    if (lower.endsWith('.pdf') || mimeType === 'application/pdf') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is required on the server to extract text from PDF documents.'
        );
      }
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64Data } },
            {
              text: 'Extract all readable text, headings, tables, and policy bullet points verbatim from this PDF document. Return plain clean text without commentary.',
            },
          ],
        },
      });
      return (response.text || '').trim();
    }

    return buffer.toString('utf-8').trim();
  }

  private async embedTexts(texts: string[]): Promise<Array<number[] | undefined>> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || texts.length === 0) {
      return texts.map(() => undefined);
    }
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const result = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: texts.slice(0, 20),
      });
      const embeddings = result.embeddings || [];
      return texts.map((_, i) => embeddings[i]?.values);
    } catch {
      return texts.map(() => undefined);
    }
  }

  private cosineSimilarity(a?: number[], b?: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  private lexicalScore(query: string, text: string): number {
    const stopWords = new Set([
      'what', 'when', 'where', 'which', 'how', 'does', 'this', 'that', 'with',
      'from', 'your', 'about', 'have', 'there', 'their', 'they', 'tell', 'please',
      'show', 'give', 'explain', 'the', 'and', 'for', 'are', 'you', 'can',
    ]);
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !stopWords.has(t));
    if (tokens.length === 0) return 0;
    const hay = text.toLowerCase();
    let hits = 0;
    for (const token of tokens) {
      if (hay.includes(token)) hits += 1;
    }
    return hits / tokens.length;
  }

  public async retrieveRelevantContext(botType: BotType, query: string) {
    const botChunks = this.chunks[botType];
    const botQa = this.state.trainingQuestions.filter(
      (q) => q.botType === botType && q.active
    );

    const [queryEmbedding] = await this.embedTexts([query]);

    const scoredChunks = botChunks
      .map((chunk) => {
        const vecScore = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        const lexScore = this.lexicalScore(query, `${chunk.docTitle} ${chunk.category} ${chunk.text}`);
        const combined = chunk.embedding && queryEmbedding ? vecScore * 0.65 + lexScore * 0.35 : lexScore;
        return { chunk, score: combined };
      })
      .sort((a, b) => b.score - a.score);

    const scoredQa = botQa
      .map((qa) => ({
        qa,
        score: this.lexicalScore(query, `${qa.question} ${qa.category} ${qa.answer}`),
      }))
      .sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.filter((s) => s.score >= 0.22).slice(0, 4);
    const topQa = scoredQa.filter((s) => s.score >= 0.34).slice(0, 4);

    return {
      topChunks: topChunks.map((s) => ({
        title: s.chunk.docTitle,
        category: s.chunk.category,
        text: s.chunk.text,
        score: s.score,
      })),
      topQa: topQa.map((s) => ({
        question: s.qa.question,
        answer: s.qa.answer,
        category: s.qa.category,
        score: s.score,
      })),
      bestScore: Math.max(topChunks[0]?.score || 0, topQa[0]?.score || 0),
    };
  }

  // Knowledge CRUD
  public getKnowledgeDocs(botType?: BotType): KnowledgeDoc[] {
    if (botType === 'website') return this.state.websiteDocs;
    if (botType === 'crm') return this.state.crmDocs;
    return [...this.state.websiteDocs, ...this.state.crmDocs];
  }

  public async addKnowledgeDoc(input: {
    botType: BotType;
    title: string;
    category: string;
    sourceType: KnowledgeDoc['sourceType'];
    content: string;
    createdBy: string;
  }): Promise<KnowledgeDoc> {
    const id = `${input.botType}-doc-${Date.now()}`;
    const now = new Date().toISOString();
    const parts = this.chunkText(input.content);
    const embeddings = await this.embedTexts(parts);
    const hasEmbeddings = embeddings.some((e) => Array.isArray(e) && e.length > 0);

    const doc: KnowledgeDoc = {
      id,
      botType: input.botType,
      title: input.title,
      category: input.category,
      sourceType: input.sourceType,
      content: input.content,
      chunkCount: parts.length,
      active: true,
      processingStatus: 'indexed',
      hasEmbeddings,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    if (input.botType === 'website') {
      this.state.websiteDocs.unshift(doc);
    } else {
      this.state.crmDocs.unshift(doc);
    }

    // Store embedded chunks directly
    parts.forEach((part, idx) => {
      this.chunks[input.botType].unshift({
        id: `${doc.id}-c${idx}`,
        docId: doc.id,
        docTitle: doc.title,
        category: doc.category,
        botType: input.botType,
        text: part,
        embedding: embeddings[idx],
      });
    });

    this.addAuditLog(
      input.createdBy,
      'KNOWLEDGE_DOC_UPLOADED',
      `${input.botType}:${doc.title}`,
      `Indexed ${parts.length} chunks (${input.sourceType.toUpperCase()}).`
    );
    this.saveState();
    return doc;
  }

  public updateKnowledgeDoc(
    id: string,
    patch: Partial<Pick<KnowledgeDoc, 'title' | 'category' | 'content' | 'active'>>,
    actorUid: string
  ): KnowledgeDoc | null {
    const all = [...this.state.websiteDocs, ...this.state.crmDocs];
    const doc = all.find((d) => d.id === id);
    if (!doc) return null;

    if (typeof patch.title === 'string') doc.title = patch.title;
    if (typeof patch.category === 'string') doc.category = patch.category;
    if (typeof patch.content === 'string') {
      doc.content = patch.content;
      doc.chunkCount = this.chunkText(patch.content).length;
    }
    if (typeof patch.active === 'boolean') {
      doc.active = patch.active;
      doc.processingStatus = patch.active ? 'indexed' : 'disabled';
    }
    doc.updatedAt = new Date().toISOString();
    this.rebuildChunks(doc.botType);
    this.addAuditLog(actorUid, 'KNOWLEDGE_DOC_UPDATED', `${doc.botType}:${doc.title}`, 'Updated document status/content.');
    this.saveState();
    return doc;
  }

  public deleteKnowledgeDoc(id: string, actorUid: string): boolean {
    const webIdx = this.state.websiteDocs.findIndex((d) => d.id === id);
    if (webIdx !== -1) {
      const [removed] = this.state.websiteDocs.splice(webIdx, 1);
      this.rebuildChunks('website');
      this.addAuditLog(actorUid, 'KNOWLEDGE_DOC_DELETED', `website:${removed.title}`, 'Removed document.');
      this.saveState();
      return true;
    }
    const crmIdx = this.state.crmDocs.findIndex((d) => d.id === id);
    if (crmIdx !== -1) {
      const [removed] = this.state.crmDocs.splice(crmIdx, 1);
      this.rebuildChunks('crm');
      this.addAuditLog(actorUid, 'KNOWLEDGE_DOC_DELETED', `crm:${removed.title}`, 'Removed document.');
      this.saveState();
      return true;
    }
    return false;
  }

  // Training Q&A CRUD
  public getTrainingQuestions(botType?: BotType): TrainingQuestion[] {
    if (!botType) return this.state.trainingQuestions;
    return this.state.trainingQuestions.filter((q) => q.botType === botType);
  }

  public addTrainingQuestion(input: {
    botType: BotType;
    category: string;
    question: string;
    answer: string;
    intent?: string;
    createdBy: string;
  }): TrainingQuestion {
    const now = new Date().toISOString();
    const record: TrainingQuestion = {
      id: `${input.botType}-qa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      botType: input.botType,
      category: input.category,
      question: input.question,
      answer: input.answer,
      intent: input.intent,
      active: true,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.state.trainingQuestions.unshift(record);
    this.addAuditLog(input.createdBy, 'QA_ADDED', `${input.botType}:${record.id}`, input.question);
    this.saveState();
    return record;
  }

  public importTrainingQuestions(
    items: Array<{ botType: BotType; category: string; question: string; answer: string }>,
    actorUid: string
  ): TrainingQuestion[] {
    const created: TrainingQuestion[] = [];
    for (const item of items) {
      if (!item.question?.trim() || !item.answer?.trim()) continue;
      created.push(
        this.addTrainingQuestion({
          botType: item.botType,
          category: item.category || 'General',
          question: item.question.trim(),
          answer: item.answer.trim(),
          createdBy: actorUid,
        })
      );
    }
    return created;
  }

  public updateTrainingQuestion(
    id: string,
    patch: Partial<Pick<TrainingQuestion, 'category' | 'question' | 'answer' | 'active'>>,
    actorUid: string
  ): TrainingQuestion | null {
    const q = this.state.trainingQuestions.find((item) => item.id === id);
    if (!q) return null;
    if (typeof patch.category === 'string') q.category = patch.category;
    if (typeof patch.question === 'string') q.question = patch.question;
    if (typeof patch.answer === 'string') q.answer = patch.answer;
    if (typeof patch.active === 'boolean') q.active = patch.active;
    q.updatedAt = new Date().toISOString();
    this.addAuditLog(actorUid, 'QA_UPDATED', `${q.botType}:${q.id}`, q.question);
    this.saveState();
    return q;
  }

  public deleteTrainingQuestion(id: string, actorUid: string): boolean {
    const idx = this.state.trainingQuestions.findIndex((item) => item.id === id);
    if (idx === -1) return false;
    const [removed] = this.state.trainingQuestions.splice(idx, 1);
    this.addAuditLog(actorUid, 'QA_DELETED', `${removed.botType}:${removed.id}`, removed.question);
    this.saveState();
    return true;
  }

  // Conversations & Escalations
  public recordChatExchange(params: {
    conversationId: string;
    ownerId: string;
    ownerLabel: string;
    botType: BotType;
    userMessage: ChatMessageItem;
    assistantMessage: ChatMessageItem;
    escalated: boolean;
  }) {
    let conv = this.state.conversations.find((c) => c.id === params.conversationId);
    const now = new Date().toISOString();
    if (!conv) {
      conv = {
        id: params.conversationId,
        ownerId: params.ownerId,
        ownerLabel: params.ownerLabel,
        botType: params.botType,
        title: params.userMessage.text.slice(0, 72),
        status: params.escalated ? 'escalated' : 'active',
        unansweredCount: params.escalated ? 1 : 0,
        messageCount: 2,
        lastMessagePreview: params.assistantMessage.text.slice(0, 140),
        createdAt: now,
        updatedAt: now,
        messages: [params.userMessage, params.assistantMessage],
      };
      this.state.conversations.unshift(conv);
    } else {
      conv.messages = [...(conv.messages || []), params.userMessage, params.assistantMessage];
      conv.messageCount = conv.messages.length;
      conv.lastMessagePreview = params.assistantMessage.text.slice(0, 140);
      conv.updatedAt = now;
      if (params.escalated) {
        conv.status = 'escalated';
        conv.unansweredCount += 1;
      }
    }

    if (params.escalated) {
      this.state.escalations.unshift({
        id: `esc-${Date.now()}`,
        ownerId: params.ownerId,
        ownerLabel: params.ownerLabel,
        botType: params.botType,
        conversationId: params.conversationId,
        question: params.userMessage.text,
        channel: 'auto',
        status: 'open',
        notes: 'Automatically escalated when query fell outside approved knowledge base.',
        createdAt: now,
        updatedAt: now,
      });
    }

    // Track usage & top questions
    const existingTop = this.state.usage.topQuestions.find(
      (t) =>
        t.botType === params.botType &&
        t.question.toLowerCase() === params.userMessage.text.trim().toLowerCase()
    );
    if (existingTop) {
      existingTop.count += 1;
    } else {
      this.state.usage.topQuestions.unshift({
        question: params.userMessage.text.slice(0, 100),
        botType: params.botType,
        count: 1,
      });
      this.state.usage.topQuestions = this.state.usage.topQuestions.slice(0, 15);
    }

    const latestDay = this.state.usage.dailySeries[this.state.usage.dailySeries.length - 1];
    if (latestDay) {
      if (params.botType === 'website') latestDay.website += 1;
      else latestDay.crm += 1;
    }

    this.saveState();
  }

  public recordTokens(botType: BotType, tokens: number) {
    if (botType === 'website') {
      this.state.usage.websiteTokens += tokens;
      this.state.usage.websiteRequests += 1;
    } else {
      this.state.usage.crmTokens += tokens;
      this.state.usage.crmRequests += 1;
    }
    this.saveState();
  }

  public setMessageFeedback(messageId: string, feedback: 'up' | 'down') {
    for (const conv of this.state.conversations) {
      const msg = conv.messages?.find((m) => m.id === messageId);
      if (msg) {
        msg.feedback = feedback;
        this.saveState();
        return true;
      }
    }
    return false;
  }

  public getConversations(botType?: BotType): ConversationSummary[] {
    if (!botType) return this.state.conversations;
    return this.state.conversations.filter((c) => c.botType === botType);
  }

  public getEscalations(): EscalationItem[] {
    return this.state.escalations;
  }

  public updateEscalation(
    id: string,
    patch: Partial<Pick<EscalationItem, 'status' | 'notes' | 'channel'>>,
    actorUid: string
  ): EscalationItem | null {
    const esc = this.state.escalations.find((e) => e.id === id);
    if (!esc) return null;
    if (patch.status) esc.status = patch.status;
    if (typeof patch.notes === 'string') esc.notes = patch.notes;
    if (patch.channel) esc.channel = patch.channel;
    esc.updatedAt = new Date().toISOString();
    this.addAuditLog(actorUid, 'ESCALATION_UPDATED', esc.id, `Status set to ${esc.status}`);
    this.saveState();
    return esc;
  }

  public createManualEscalation(input: {
    ownerId: string;
    ownerLabel: string;
    botType: BotType;
    conversationId: string;
    question: string;
    channel: EscalationItem['channel'];
  }): EscalationItem {
    const now = new Date().toISOString();
    const esc: EscalationItem = {
      id: `esc-${Date.now()}`,
      ownerId: input.ownerId,
      ownerLabel: input.ownerLabel,
      botType: input.botType,
      conversationId: input.conversationId,
      question: input.question,
      channel: input.channel,
      status: 'open',
      notes: `User initiated ${input.channel} support handoff.`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.escalations.unshift(esc);
    this.saveState();
    return esc;
  }

  // Config & Users & Audit
  public getSupportConfig(): SupportConfig {
    return this.state.supportConfig;
  }

  public updateSupportConfig(patch: Partial<SupportConfig>, actorUid: string): SupportConfig {
    this.state.supportConfig = {
      ...this.state.supportConfig,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.addAuditLog(actorUid, 'SUPPORT_SETTINGS_UPDATED', 'support_settings', 'Updated contact channels.');
    this.saveState();
    return this.state.supportConfig;
  }

  public getBotConfigs(): Record<BotType, BotConfig> {
    return this.state.botConfigs;
  }

  public updateBotConfig(
    botType: BotType,
    patch: Partial<BotConfig>,
    actorUid: string
  ): BotConfig {
    this.state.botConfigs[botType] = {
      ...this.state.botConfigs[botType],
      ...patch,
      botType,
      updatedAt: new Date().toISOString(),
    };
    this.addAuditLog(actorUid, 'BOT_CONFIG_UPDATED', botType, `Updated ${botType} bot settings.`);
    this.saveState();
    return this.state.botConfigs[botType];
  }

  public getUsers(): UserProfile[] {
    return this.state.users;
  }

  public upsertUser(user: UserProfile, actorUid: string): UserProfile {
    const idx = this.state.users.findIndex((u) => u.uid === user.uid || u.email === user.email);
    const now = new Date().toISOString();
    if (idx !== -1) {
      this.state.users[idx] = { ...this.state.users[idx], ...user, updatedAt: now };
    } else {
      this.state.users.unshift({ ...user, createdAt: now, updatedAt: now });
    }
    this.addAuditLog(actorUid, 'USER_ROLE_UPDATED', user.email || user.uid, `Role: ${user.role}`);
    this.saveState();
    return this.state.users.find((u) => u.uid === user.uid || u.email === user.email)!;
  }

  public getAuditLogs(): AuditLogItem[] {
    return this.state.auditLogs.slice(0, 60);
  }

  public addAuditLog(actorUid: string, action: string, target: string, detail: string) {
    this.state.auditLogs.unshift({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      actorUid,
      actorLabel: actorUid,
      action,
      target,
      detail,
      createdAt: new Date().toISOString(),
    });
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 200);
    }
  }

  public getAnalyticsOverview() {
    const webConvs = this.state.conversations.filter((c) => c.botType === 'website');
    const crmConvs = this.state.conversations.filter((c) => c.botType === 'crm');
    const totalMessages = this.state.conversations.reduce(
      (acc, c) => acc + (c.messages?.length || c.messageCount || 0),
      0
    );
    const unansweredQuestions = this.state.conversations.reduce(
      (acc, c) => acc + (c.unansweredCount || 0),
      0
    );

    return {
      cards: {
        totalWebsiteConversations: webConvs.length,
        totalCrmConversations: crmConvs.length,
        totalMessages,
        totalActiveUsers: this.state.users.filter((u) => u.status === 'active').length,
        totalKnowledgeDocuments: this.state.websiteDocs.length + this.state.crmDocs.length,
        unansweredQuestions,
        escalatedConversations: this.state.escalations.filter((e) => e.status !== 'resolved').length,
        totalAiTokens: this.state.usage.websiteTokens + this.state.usage.crmTokens,
      },
      usage: this.state.usage,
      botComparison: [
        { name: 'Website Bot', value: webConvs.length, tokens: this.state.usage.websiteTokens },
        { name: 'CRM Bot', value: crmConvs.length, tokens: this.state.usage.crmTokens },
      ],
    };
  }
}

export const knowledgeStore = new PlatformKnowledgeStore();
