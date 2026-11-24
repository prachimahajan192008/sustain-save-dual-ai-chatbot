import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { verifyFirebaseIdToken, type VerifiedFirebaseToken } from './server/authVerify';
import { getScopedDemoDataset } from './server/crmDemoData';
import { generateCrmBotReply, generateWebsiteBotReply } from './server/geminiService';
import { knowledgeStore } from './server/knowledgeStore';
import type { BotType, ChatMessageItem, UserProfile, UserRole } from './src/types/platform';

const PORT = 3000;
const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'prachiamahajan192008@gmail.com';

interface AuthedRequest extends Request {
  authUser?: {
    uid: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    role: UserRole;
  };
}

// In-memory sliding-window rate limiter
const rateBuckets = new Map<string, number[]>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const history = (rateBuckets.get(key) || []).filter((ts) => now - ts < windowMs);
    if (history.length >= maxRequests) {
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait a moment before sending another request.',
      });
      return;
    }
    history.push(now);
    rateBuckets.set(key, history);
    next();
  };
}

function resolveUserRole(token: VerifiedFirebaseToken): UserProfile {
  const emailLower = token.email.toLowerCase();
  const users = knowledgeStore.getUsers();
  const existing = users.find(
    (u) => u.uid === token.uid || (u.email && u.email.toLowerCase() === emailLower)
  );

  if (token.emailVerified && emailLower === BOOTSTRAP_SUPER_ADMIN_EMAIL) {
    if (!existing || existing.role !== 'SUPER_ADMIN' || existing.uid !== token.uid) {
      return knowledgeStore.upsertUser(
        {
          uid: token.uid,
          displayName: token.name || existing?.displayName || 'Super Admin',
          email: token.email,
          role: 'SUPER_ADMIN',
          department: existing?.department || 'Executive & AI Governance',
          status: 'active',
        },
        'system-bootstrap'
      );
    }
    return existing;
  }

  if (existing) {
    if (existing.uid !== token.uid) {
      return knowledgeStore.upsertUser(
        { ...existing, uid: token.uid, displayName: token.name || existing.displayName },
        'system-sync'
      );
    }
    return existing;
  }

  // New unprivileged users default strictly to WEBSITE_VISITOR
  return knowledgeStore.upsertUser(
    {
      uid: token.uid,
      displayName: token.name || token.email.split('@')[0] || 'Workspace User',
      email: token.email,
      role: 'WEBSITE_VISITOR',
      department: 'External',
      status: 'active',
    },
    'self-registration'
  );
}

async function authenticate(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = await verifyFirebaseIdToken(req.headers.authorization);
  if (!token || !token.emailVerified) {
    res.status(401).json({
      error: 'Authentication required. Please sign in with a verified Google account.',
    });
    return;
  }
  const profile = resolveUserRole(token);
  if (profile.status === 'suspended') {
    res.status(403).json({ error: 'Account is suspended. Contact a Super Admin.' });
    return;
  }
  req.authUser = {
    uid: token.uid,
    email: token.email,
    emailVerified: token.emailVerified,
    displayName: profile.displayName,
    role: profile.role,
  };
  next();
}

function requireRole(allowed: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser || !allowed.includes(req.authUser.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowed.join(' or ')}.`,
      });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '12mb' }));

  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Public bootstrap (never exposes system prompts or CRM data)
  app.get('/api/public/bootstrap', (_req, res) => {
    const webCfg = knowledgeStore.getBotConfigs().website;
    const support = knowledgeStore.getSupportConfig();
    res.json({
      bot: {
        botName: webCfg.botName,
        welcomeMessage: webCfg.welcomeMessage,
        enabled: webCfg.enabled,
        suggestedQuestions: webCfg.suggestedQuestions,
      },
      support,
    });
  });

  // Verify Firebase Auth token & return server-authoritative RBAC profile
  app.get('/api/auth/session', authenticate, (req: AuthedRequest, res) => {
    res.json({ user: req.authUser });
  });

  // BOT 1: Public Website AI Chatbot
  app.post(
    '/api/chat/website',
    rateLimit(30, 60_000),
    async (req: AuthedRequest, res) => {
      try {
        const { message, conversationId, history, visitorLabel } = req.body as {
          message?: string;
          conversationId?: string;
          history?: Array<{ sender: 'user' | 'assistant'; text: string }>;
          visitorLabel?: string;
        };
        if (!message || typeof message !== 'string' || !message.trim()) {
          res.status(400).json({ error: 'Message text is required.' });
          return;
        }

        const safeConvId =
          conversationId && /^[a-zA-Z0-9_-]{3,80}$/.test(conversationId)
            ? conversationId
            : `web-${Date.now()}`;

        const token = await verifyFirebaseIdToken(req.headers.authorization);
        const ownerId = token?.uid || safeConvId;
        const ownerLabel = token?.email || visitorLabel || 'Public Website Visitor';

        const reply = await generateWebsiteBotReply(
          message,
          Array.isArray(history) ? history : []
        );
        const now = new Date().toISOString();

        const userMsg: ChatMessageItem = {
          id: `u-${Date.now()}`,
          conversationId: safeConvId,
          botType: 'website',
          sender: 'user',
          text: message.trim().slice(0, 2000),
          timestamp: now,
          feedback: 'none',
        };
        const botMsg: ChatMessageItem = {
          id: `a-${Date.now() + 1}`,
          conversationId: safeConvId,
          botType: 'website',
          sender: 'assistant',
          text: reply.text,
          timestamp: now,
          escalated: reply.escalated,
          sourceRefs: reply.sourceRefs,
          chart: reply.chart,
          feedback: 'none',
        };

        knowledgeStore.recordChatExchange({
          conversationId: safeConvId,
          ownerId,
          ownerLabel,
          botType: 'website',
          userMessage: userMsg,
          assistantMessage: botMsg,
          escalated: reply.escalated,
        });

        res.json({
          conversationId: safeConvId,
          userMessage: userMsg,
          assistantMessage: botMsg,
          support: knowledgeStore.getSupportConfig(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Website chatbot error';
        res.status(500).json({ error: msg });
      }
    }
  );

  // Public feedback & support escalation logging
  app.post('/api/chat/feedback', rateLimit(40, 60_000), (req, res) => {
    const { messageId, feedback } = req.body as {
      messageId?: string;
      feedback?: 'up' | 'down';
    };
    if (!messageId || (feedback !== 'up' && feedback !== 'down')) {
      res.status(400).json({ error: 'Valid messageId and feedback are required.' });
      return;
    }
    const updated = knowledgeStore.setMessageFeedback(messageId, feedback);
    res.json({ ok: updated });
  });

  app.post('/api/public/escalation', rateLimit(15, 60_000), (req, res) => {
    const { conversationId, question, channel, botType } = req.body as {
      conversationId?: string;
      question?: string;
      channel?: 'call' | 'whatsapp' | 'email';
      botType?: BotType;
    };
    if (!question || !channel) {
      res.status(400).json({ error: 'Question and support channel are required.' });
      return;
    }
    const esc = knowledgeStore.createManualEscalation({
      ownerId: conversationId || 'public-visitor',
      ownerLabel: 'Website Support Handoff',
      botType: botType === 'crm' ? 'crm' : 'website',
      conversationId: conversationId || `web-${Date.now()}`,
      question: question.slice(0, 800),
      channel,
    });
    res.json({ escalation: esc });
  });

  // BOT 2: Internal CRM AI Chatbot (Strictly Authenticated + Read-Only)
  app.post(
    '/api/chat/crm',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN', 'CRM_EMPLOYEE']),
    rateLimit(30, 60_000),
    async (req: AuthedRequest, res) => {
      try {
        const { message, conversationId, history, previewRole } = req.body as {
          message?: string;
          conversationId?: string;
          history?: Array<{ sender: 'user' | 'assistant'; text: string }>;
          previewRole?: UserRole;
        };
        if (!message || typeof message !== 'string' || !message.trim()) {
          res.status(400).json({ error: 'Message text is required.' });
          return;
        }

        const effectiveRole: UserRole =
          req.authUser!.role === 'SUPER_ADMIN' &&
          previewRole &&
          ['SUPER_ADMIN', 'CRM_ADMIN', 'CRM_EMPLOYEE'].includes(previewRole)
            ? previewRole
            : req.authUser!.role;

        const safeConvId =
          conversationId && /^[a-zA-Z0-9_-]{3,80}$/.test(conversationId)
            ? conversationId
            : `crm-${Date.now()}`;

        const reply = await generateCrmBotReply(
          message,
          effectiveRole,
          req.authUser!.displayName,
          Array.isArray(history) ? history : []
        );

        const now = new Date().toISOString();
        const userMsg: ChatMessageItem = {
          id: `u-${Date.now()}`,
          conversationId: safeConvId,
          botType: 'crm',
          sender: 'user',
          text: message.trim().slice(0, 2000),
          timestamp: now,
          feedback: 'none',
        };
        const botMsg: ChatMessageItem = {
          id: `a-${Date.now() + 1}`,
          conversationId: safeConvId,
          botType: 'crm',
          sender: 'assistant',
          text: reply.text,
          timestamp: now,
          escalated: reply.escalated,
          sourceRefs: reply.sourceRefs,
          chart: reply.chart,
          secondaryChart: reply.secondaryChart,
          tablePreview: reply.tablePreview,
          isDemoData: reply.isDemoData,
          feedback: 'none',
        };

        knowledgeStore.recordChatExchange({
          conversationId: safeConvId,
          ownerId: req.authUser!.uid,
          ownerLabel: `${req.authUser!.displayName} (${effectiveRole})`,
          botType: 'crm',
          userMessage: userMsg,
          assistantMessage: botMsg,
          escalated: reply.escalated,
        });

        res.json({
          conversationId: safeConvId,
          userMessage: userMsg,
          assistantMessage: botMsg,
          effectiveRole,
          support: knowledgeStore.getSupportConfig(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'CRM chatbot error';
        res.status(500).json({ error: msg });
      }
    }
  );

  // CRM Read-Only Data Explorer & Visual Reports
  app.get(
    '/api/crm/demo-data',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN', 'CRM_EMPLOYEE']),
    (req: AuthedRequest, res) => {
      const requestedPreview = req.query.previewRole as UserRole | undefined;
      const effectiveRole: UserRole =
        req.authUser!.role === 'SUPER_ADMIN' &&
        requestedPreview &&
        ['SUPER_ADMIN', 'CRM_ADMIN', 'CRM_EMPLOYEE'].includes(requestedPreview)
          ? requestedPreview
          : req.authUser!.role;

      const crmConfig = knowledgeStore.getBotConfigs().crm;
      const scoped = getScopedDemoDataset(effectiveRole, req.authUser!.displayName);
      res.json({
        ...scoped,
        effectiveRole,
        crmBotConfig: {
          botName: crmConfig.botName,
          welcomeMessage: crmConfig.welcomeMessage,
          suggestedQuestions: crmConfig.suggestedQuestions,
          enabled: crmConfig.enabled,
        },
        support: knowledgeStore.getSupportConfig(),
      });
    }
  );

  // Knowledge Base Management (strictly separated by botType)
  app.get(
    '/api/knowledge',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN', 'CRM_EMPLOYEE']),
    (req: AuthedRequest, res) => {
      const botType = req.query.botType as BotType | undefined;
      if (req.authUser!.role !== 'SUPER_ADMIN' && botType === 'website') {
        res.status(403).json({ error: 'Only Super Admin can access Website Knowledge Base.' });
        return;
      }
      const docs = knowledgeStore.getKnowledgeDocs(
        req.authUser!.role === 'SUPER_ADMIN' ? botType : 'crm'
      );
      res.json({ documents: docs });
    }
  );

  app.post(
    '/api/knowledge/upload',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    rateLimit(20, 60_000),
    async (req: AuthedRequest, res) => {
      try {
        const { botType, title, category, sourceType, content, fileName, mimeType, base64Data } =
          req.body as {
            botType?: BotType;
            title?: string;
            category?: string;
            sourceType?: 'pdf' | 'docx' | 'txt' | 'custom';
            content?: string;
            fileName?: string;
            mimeType?: string;
            base64Data?: string;
          };

        if (!botType || (botType !== 'website' && botType !== 'crm')) {
          res.status(400).json({ error: 'Valid botType (website or crm) is required.' });
          return;
        }
        if (botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Only Super Admin can modify Website Knowledge Base.' });
          return;
        }
        if (!title || !title.trim()) {
          res.status(400).json({ error: 'Document title is required.' });
          return;
        }

        let extractedText = (content || '').trim();
        if (!extractedText && base64Data && fileName) {
          extractedText = await knowledgeStore.extractFileText(
            fileName,
            mimeType || 'application/octet-stream',
            base64Data
          );
        }

        if (!extractedText || extractedText.length < 10) {
          res.status(400).json({
            error: 'No readable text could be extracted from the uploaded file or text field.',
          });
          return;
        }

        const doc = await knowledgeStore.addKnowledgeDoc({
          botType,
          title: title.trim().slice(0, 180),
          category: (category || 'General').trim().slice(0, 80),
          sourceType: sourceType || 'custom',
          content: extractedText.slice(0, 80000),
          createdBy: req.authUser!.uid,
        });

        res.json({ document: doc });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to process document';
        res.status(500).json({ error: msg });
      }
    }
  );

  app.put(
    '/api/knowledge/:id',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const id = String(req.params.id);
      const existing = knowledgeStore.getKnowledgeDocs().find((d) => d.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      if (existing.botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only Super Admin can modify Website documents.' });
        return;
      }
      const updated = knowledgeStore.updateKnowledgeDoc(id, req.body, req.authUser!.uid);
      res.json({ document: updated });
    }
  );

  app.delete(
    '/api/knowledge/:id',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const id = String(req.params.id);
      const existing = knowledgeStore.getKnowledgeDocs().find((d) => d.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Document not found.' });
        return;
      }
      if (existing.botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only Super Admin can delete Website documents.' });
        return;
      }
      knowledgeStore.deleteKnowledgeDoc(id, req.authUser!.uid);
      res.json({ ok: true });
    }
  );

  // Q&A Training Management
  app.get(
    '/api/training',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN', 'CRM_EMPLOYEE']),
    (req: AuthedRequest, res) => {
      const botType = req.query.botType as BotType | undefined;
      if (req.authUser!.role !== 'SUPER_ADMIN' && botType === 'website') {
        res.status(403).json({ error: 'Restricted to Super Admin.' });
        return;
      }
      const questions = knowledgeStore.getTrainingQuestions(
        req.authUser!.role === 'SUPER_ADMIN' ? botType : 'crm'
      );
      res.json({ questions });
    }
  );

  app.post(
    '/api/training',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const { botType, category, question, answer, intent } = req.body as {
        botType?: BotType;
        category?: string;
        question?: string;
        answer?: string;
        intent?: string;
      };
      if (!botType || !question?.trim() || !answer?.trim()) {
        res.status(400).json({ error: 'botType, question, and answer are required.' });
        return;
      }
      if (botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only Super Admin can train Website Bot.' });
        return;
      }
      const created = knowledgeStore.addTrainingQuestion({
        botType,
        category: (category || 'General').trim(),
        question: question.trim(),
        answer: answer.trim(),
        intent,
        createdBy: req.authUser!.uid,
      });
      res.json({ question: created });
    }
  );

  app.post(
    '/api/training/import',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const { items } = req.body as {
        items?: Array<{ botType: BotType; category: string; question: string; answer: string }>;
      };
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Provide an array of training items to import.' });
        return;
      }
      if (
        req.authUser!.role !== 'SUPER_ADMIN' &&
        items.some((i) => i.botType === 'website')
      ) {
        res.status(403).json({ error: 'Only Super Admin can import Website Bot Q&As.' });
        return;
      }
      const created = knowledgeStore.importTrainingQuestions(items, req.authUser!.uid);
      res.json({ importedCount: created.length, questions: created });
    }
  );

  app.put(
    '/api/training/:id',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const id = String(req.params.id);
      const existing = knowledgeStore.getTrainingQuestions().find((q) => q.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Training record not found.' });
        return;
      }
      if (existing.botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only Super Admin can update Website Q&As.' });
        return;
      }
      const updated = knowledgeStore.updateTrainingQuestion(id, req.body, req.authUser!.uid);
      res.json({ question: updated });
    }
  );

  app.delete(
    '/api/training/:id',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const id = String(req.params.id);
      const existing = knowledgeStore.getTrainingQuestions().find((q) => q.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Training record not found.' });
        return;
      }
      if (existing.botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only Super Admin can delete Website Q&As.' });
        return;
      }
      knowledgeStore.deleteTrainingQuestion(id, req.authUser!.uid);
      res.json({ ok: true });
    }
  );

  // Admin Analytics, Chat History, Escalations, Users, Audit Logs & Settings
  app.get(
    '/api/admin/analytics',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (_req, res) => {
      res.json(knowledgeStore.getAnalyticsOverview());
    }
  );

  app.get(
    '/api/admin/conversations',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const botType = req.query.botType as BotType | undefined;
      if (req.authUser!.role !== 'SUPER_ADMIN' && botType === 'website') {
        res.status(403).json({ error: 'Only Super Admin can inspect Website Chat History.' });
        return;
      }
      const list = knowledgeStore.getConversations(
        req.authUser!.role === 'SUPER_ADMIN' ? botType : 'crm'
      );
      res.json({ conversations: list });
    }
  );

  app.get(
    '/api/admin/escalations',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const list = knowledgeStore.getEscalations();
      const filtered =
        req.authUser!.role === 'SUPER_ADMIN'
          ? list
          : list.filter((e) => e.botType === 'crm');
      res.json({ escalations: filtered });
    }
  );

  app.patch(
    '/api/admin/escalations/:id',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const updated = knowledgeStore.updateEscalation(
        String(req.params.id),
        req.body,
        req.authUser!.uid
      );
      if (!updated) {
        res.status(404).json({ error: 'Escalation not found.' });
        return;
      }
      res.json({ escalation: updated });
    }
  );

  app.get(
    '/api/admin/users',
    authenticate,
    requireRole(['SUPER_ADMIN']),
    (_req, res) => {
      res.json({ users: knowledgeStore.getUsers() });
    }
  );

  app.post(
    '/api/admin/users',
    authenticate,
    requireRole(['SUPER_ADMIN']),
    (req: AuthedRequest, res) => {
      const { uid, displayName, email, role, department, status } = req.body as Partial<UserProfile>;
      if (!email || !role || !displayName) {
        res.status(400).json({ error: 'displayName, email, and role are required.' });
        return;
      }
      const validRoles: UserRole[] = [
        'SUPER_ADMIN',
        'CRM_ADMIN',
        'CRM_EMPLOYEE',
        'WEBSITE_VISITOR',
      ];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role.' });
        return;
      }
      const saved = knowledgeStore.upsertUser(
        {
          uid: uid || `user-${Date.now()}`,
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          role,
          department: department?.trim() || 'Operations',
          status: status === 'suspended' ? 'suspended' : 'active',
        },
        req.authUser!.uid
      );
      res.json({ user: saved });
    }
  );

  app.get(
    '/api/admin/audit-logs',
    authenticate,
    requireRole(['SUPER_ADMIN']),
    (_req, res) => {
      res.json({ logs: knowledgeStore.getAuditLogs() });
    }
  );

  app.get(
    '/api/settings',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const bots = knowledgeStore.getBotConfigs();
      res.json({
        botConfigs:
          req.authUser!.role === 'SUPER_ADMIN'
            ? bots
            : { crm: bots.crm },
        supportConfig: knowledgeStore.getSupportConfig(),
      });
    }
  );

  app.put(
    '/api/settings/bot/:botType',
    authenticate,
    requireRole(['SUPER_ADMIN', 'CRM_ADMIN']),
    (req: AuthedRequest, res) => {
      const botType = req.params.botType as BotType;
      if (botType !== 'website' && botType !== 'crm') {
        res.status(400).json({ error: 'Invalid botType.' });
        return;
      }
      if (botType === 'website' && req.authUser!.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only Super Admin can configure Website Bot.' });
        return;
      }
      const updated = knowledgeStore.updateBotConfig(botType, req.body, req.authUser!.uid);
      res.json({ config: updated });
    }
  );

  app.put(
    '/api/settings/support',
    authenticate,
    requireRole(['SUPER_ADMIN']),
    (req: AuthedRequest, res) => {
      const updated = knowledgeStore.updateSupportConfig(req.body, req.authUser!.uid);
      res.json({ supportConfig: updated });
    }
  );

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sustain & Save Dual AI Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
