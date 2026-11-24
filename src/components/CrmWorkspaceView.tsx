import {
  BarChart3,
  Bot,
  Database,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { auth, persistChatTurnToFirestore } from '../lib/firebase';
import type {
  ChartPayload,
  ChatMessageItem,
  DemoCustomer,
  DemoFollowUp,
  DemoLead,
  DemoSupportTicket,
  SupportConfig,
  UserRole,
} from '../types/platform';
import { ChartCard } from './ChartCard';

interface CrmWorkspaceViewProps {
  userRole: UserRole | null;
  userName: string;
  onOpenAuth: () => void;
  support: SupportConfig;
}

type CrmSubTab = 'copilot' | 'reports' | 'explorer';
type ExplorerDatasetTab = 'leads' | 'customers' | 'followUps' | 'tickets';

export function CrmWorkspaceView({
  userRole,
  userName,
  onOpenAuth,
  support,
}: CrmWorkspaceViewProps) {
  const isAuthorized =
    userRole === 'SUPER_ADMIN' ||
    userRole === 'CRM_ADMIN' ||
    userRole === 'CRM_EMPLOYEE';

  const [subTab, setSubTab] = useState<CrmSubTab>('copilot');
  const [previewRole, setPreviewRole] = useState<UserRole>(
    userRole || 'CRM_EMPLOYEE'
  );
  const [effectiveRole, setEffectiveRole] = useState<UserRole>(
    userRole || 'CRM_EMPLOYEE'
  );
  const [scopeLabel, setScopeLabel] = useState<string>('DEMO DATA');
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [customers, setCustomers] = useState<DemoCustomer[]>([]);
  const [followUps, setFollowUps] = useState<DemoFollowUp[]>([]);
  const [tickets, setTickets] = useState<DemoSupportTicket[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [welcomeMsg, setWelcomeMsg] = useState<string>(
    'Welcome to the internal CRM AI Assistant. Ask read-only questions about leads, customers, follow-ups, tickets, or CRM SOPs.'
  );
  const [botEnabled, setBotEnabled] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [conversationId, setConversationId] = useState(
    () => `crm-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [explorerTab, setExplorerTab] = useState<ExplorerDatasetTab>('leads');
  const [searchTerm, setSearchTerm] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userRole && userRole !== 'WEBSITE_VISITOR') {
      setPreviewRole(userRole);
    }
  }, [userRole]);

  const fetchCrmData = useCallback(async () => {
    if (!isAuthorized || !auth.currentUser) return;
    setLoadingData(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const queryParam =
        userRole === 'SUPER_ADMIN' ? `?previewRole=${previewRole}` : '';
      const res = await fetch(`/api/crm/demo-data${queryParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setLeads(data.leads || []);
      setCustomers(data.customers || []);
      setFollowUps(data.followUps || []);
      setTickets(data.tickets || []);
      setScopeLabel(data.scopeLabel || 'DEMO DATA');
      setEffectiveRole(data.effectiveRole || userRole || 'CRM_EMPLOYEE');
      if (data.crmBotConfig) {
        setWelcomeMsg(data.crmBotConfig.welcomeMessage);
        setSuggestedQuestions(data.crmBotConfig.suggestedQuestions || []);
        setBotEnabled(data.crmBotConfig.enabled);
        setMessages((prev) =>
          prev.length === 0
            ? [
                {
                  id: 'welcome-crm',
                  conversationId,
                  botType: 'crm',
                  sender: 'assistant',
                  text: data.crmBotConfig.welcomeMessage,
                  timestamp: new Date().toISOString(),
                  feedback: 'none',
                },
              ]
            : prev
        );
      }
    } finally {
      setLoadingData(false);
    }
  }, [isAuthorized, previewRole, userRole, conversationId]);

  useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  if (!isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#1557B0] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            CRM Employee Authentication Required
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Bot 2 (CRM AI Chatbot) and read-only CRM records are strictly restricted
            to verified CRM Employees, CRM Admins, and Super Admins. Public visitors
            cannot access CRM data.
          </p>
          {userRole === 'WEBSITE_VISITOR' ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 max-w-md mx-auto">
              You are signed in as a Website Visitor. Ask a Super Admin to grant CRM
              Employee or CRM Admin access to your account.
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-[#1557B0] hover:bg-[#114690] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Sign In with Google Workspace
            </button>
          )}
        </div>
      </div>
    );
  }

  const resetCrmChat = () => {
    const nextId = `crm-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setConversationId(nextId);
    setMessages([
      {
        id: 'welcome-crm',
        conversationId: nextId,
        botType: 'crm',
        sender: 'assistant',
        text: welcomeMsg,
        timestamp: new Date().toISOString(),
        feedback: 'none',
      },
    ]);
    setChatError(null);
  };

  const sendCrmMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || chatLoading || !auth.currentUser) return;

    setInput('');
    setChatError(null);
    const optimisticUser: ChatMessageItem = {
      id: `local-crm-u-${Date.now()}`,
      conversationId,
      botType: 'crm',
      sender: 'user',
      text: content,
      timestamp: new Date().toISOString(),
      feedback: 'none',
    };
    setMessages((prev) => [...prev, optimisticUser]);
    setChatLoading(true);

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/chat/crm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: content,
          conversationId,
          previewRole: userRole === 'SUPER_ADMIN' ? previewRole : undefined,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to query CRM Copilot.');
      }
      const serverUser = data.userMessage as ChatMessageItem;
      const serverBot = data.assistantMessage as ChatMessageItem;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        serverUser,
        serverBot,
      ]);

      persistChatTurnToFirestore({
        botType: 'crm',
        conversationId,
        userMessage: serverUser,
        assistantMessage: serverBot,
      });
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'CRM request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleFeedback = async (msgId: string, feedback: 'up' | 'down') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback } : m))
    );
    await fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId, feedback }),
    }).catch(() => {});
  };

  // Dynamic Recharts datasets computed directly from authorized read-only CRM arrays
  const leadsBySourceChart: ChartPayload = {
    type: 'pie',
    title: 'Leads by Source (DEMO)',
    subtitle: `${leads.length} authorized leads`,
    valueLabel: 'Leads',
    data: Object.entries(
      leads.reduce<Record<string, number>>((acc, l) => {
        acc[l.source] = (acc[l.source] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
  };

  const leadsByStageChart: ChartPayload = {
    type: 'bar',
    title: 'Leads by Pipeline Stage (DEMO)',
    subtitle: 'Read-only status distribution',
    valueLabel: 'Leads',
    data: Object.entries(
      leads.reduce<Record<string, number>>((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
  };

  const followUpStatusChart: ChartPayload = {
    type: 'bar',
    title: 'Follow-Up Cadence Status (DEMO)',
    subtitle: `${followUps.length} tasks`,
    valueLabel: 'Follow-Ups',
    data: Object.entries(
      followUps.reduce<Record<string, number>>((acc, f) => {
        acc[f.status] = (acc[f.status] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
  };

  const ticketCategoryChart: ChartPayload = {
    type: 'pie',
    title: 'Support Tickets by Category (DEMO)',
    subtitle: `${tickets.length} tickets`,
    valueLabel: 'Tickets',
    data: Object.entries(
      tickets.reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })),
  };

  const acquisitionTrendChart: ChartPayload = {
    type: 'line',
    title: 'Monthly Lead & Customer Acquisition (DEMO)',
    subtitle: 'Sep – Nov 2026',
    valueLabel: 'Leads',
    secondaryLabel: 'Customers',
    data: [
      {
        name: 'Sep 2026',
        value: leads.filter((l) => l.createdAt.startsWith('2026-09')).length,
        secondary: customers.filter((c) => c.registeredAt.startsWith('2026-09')).length,
      },
      {
        name: 'Oct 2026',
        value: leads.filter((l) => l.createdAt.startsWith('2026-10')).length,
        secondary: customers.filter((c) => c.registeredAt.startsWith('2026-10')).length,
      },
      {
        name: 'Nov 2026',
        value: leads.filter((l) => l.createdAt.startsWith('2026-11')).length,
        secondary: customers.filter((c) => c.registeredAt.startsWith('2026-11')).length,
      },
    ],
  };

  const qLower = searchTerm.toLowerCase();
  const filteredLeads = leads.filter(
    (l) =>
      !qLower ||
      l.company.toLowerCase().includes(qLower) ||
      l.source.toLowerCase().includes(qLower) ||
      l.status.toLowerCase().includes(qLower) ||
      l.owner.toLowerCase().includes(qLower)
  );
  const filteredCustomers = customers.filter(
    (c) =>
      !qLower ||
      c.company.toLowerCase().includes(qLower) ||
      c.industry.toLowerCase().includes(qLower) ||
      c.plan.toLowerCase().includes(qLower)
  );
  const filteredFollowUps = followUps.filter(
    (f) =>
      !qLower ||
      f.accountName.toLowerCase().includes(qLower) ||
      f.subject.toLowerCase().includes(qLower) ||
      f.status.toLowerCase().includes(qLower)
  );
  const filteredTickets = tickets.filter(
    (t) =>
      !qLower ||
      t.customer.toLowerCase().includes(qLower) ||
      t.subject.toLowerCase().includes(qLower) ||
      t.status.toLowerCase().includes(qLower)
  );

  const telHref = `tel:${support.supportPhone.replace(/\s+/g, '')}`;
  const waHref = `https://wa.me/${support.whatsappNumber.replace(/[^0-9]/g, '')}`;
  const mailHref = `mailto:${support.supportEmail}`;

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)]">
      {/* Workspace Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#3C9A35]">Read-Only CRM</span>
              <span>·</span>
              <span>{scopeLabel}</span>
              <span>·</span>
              <span>Signed in: {userName} ({effectiveRole})</span>
            </div>
            <h1 className="text-lg font-bold text-[#0F172A]">
              Bot 2 — Internal CRM AI Workspace
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {userRole === 'SUPER_ADMIN' && (
              <div className="flex items-center gap-2 text-xs">
                <label htmlFor="crm-role-preview" className="text-slate-500 font-medium">
                  Scope Preview:
                </label>
                <select
                  id="crm-role-preview"
                  value={previewRole}
                  onChange={(e) => setPreviewRole(e.target.value as UserRole)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (All Data)</option>
                  <option value="CRM_ADMIN">CRM_ADMIN (All Data)</option>
                  <option value="CRM_EMPLOYEE">CRM_EMPLOYEE (Owner Scoped)</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSubTab('copilot')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  subTab === 'copilot'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                CRM AI Chat
              </button>
              <button
                type="button"
                onClick={() => setSubTab('reports')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  subTab === 'reports'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                CRM Reports
              </button>
              <button
                type="button"
                onClick={() => setSubTab('explorer')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  subTab === 'explorer'
                    ? 'bg-white text-[#0F172A] shadow-sm'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Data Explorer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Data Notice */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-700" />
            <span>
              <strong>DEMO CRM PROVIDER ACTIVE:</strong> Showing clearly marked sample
              records ({leads.length} leads, {customers.length} customers,{' '}
              {followUps.length} follow-ups, {tickets.length} tickets) in strict
              read-only mode.
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-800">
            Mutations Blocked Server-Side
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {subTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Suggested Prompts & Guardrails */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[#0F172A]">
                    Quick CRM Queries
                  </h2>
                  <button
                    type="button"
                    onClick={resetCrmChat}
                    className="inline-flex items-center gap-1 text-xs text-[#1557B0] hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    New Chat
                  </button>
                </div>
                <div className="space-y-1.5">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendCrmMessage(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-[#3C9A35] hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      sendCrmMessage('Delete all lost leads from the CRM database.')
                    }
                    className="w-full text-left text-xs px-3 py-2 rounded-lg border border-dashed border-slate-300 hover:border-red-300 hover:bg-red-50/40 text-slate-600 transition-colors"
                  >
                    Test Read-Only Guard (Delete request)
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2 text-xs text-slate-600">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  CRM Bot Security Rules
                </h3>
                <p>· Read-only access: never inserts, edits, or deletes CRM data.</p>
                <p>· Isolated index: never mixes with public Website Bot docs.</p>
                <p>· Verified numbers: Recharts visuals compute directly from CRM rows.</p>
                <p>· Pre-trained with 100 CRM workflow &amp; analytics Q&amp;As.</p>
              </div>
            </div>

            {/* Right: CRM Chat Workspace */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[640px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1557B0] text-white flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#0F172A]">
                      Sustain &amp; Save CRM Copilot
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Read-Only · Role: {effectiveRole}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  {loadingData ? 'Syncing...' : 'Connected (DEMO)'}
                </span>
              </div>

              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 bg-white"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-[#1557B0] text-white'
                          : 'bg-slate-50 border border-slate-200 text-[#0F172A]'
                      }`}
                    >
                      {msg.text}
                    </div>

                    {(msg.chart || msg.secondaryChart) && (
                      <div className="w-full mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.chart && <ChartCard chart={msg.chart} compact />}
                        {msg.secondaryChart && (
                          <ChartCard chart={msg.secondaryChart} compact />
                        )}
                      </div>
                    )}

                    {msg.tablePreview && msg.tablePreview.rows.length > 0 && (
                      <div className="w-full mt-3 overflow-x-auto border border-slate-200 rounded-xl bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                              {msg.tablePreview.columns.map((col) => (
                                <th key={col} className="px-3 py-2 font-semibold">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.tablePreview.rows.map((row, idx) => (
                              <tr
                                key={idx}
                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                              >
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="px-3 py-2 text-slate-700 tabular-nums"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {msg.escalated && (
                      <div className="mt-2 w-full bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-amber-900">
                          Escalate to CRM Support Team (NMD Pvt Ltd)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={telHref}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1557B0] text-white text-xs font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Call {support.supportPhone}
                          </a>
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3C9A35] text-white text-xs font-medium"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp Support
                          </a>
                          <a
                            href={mailHref}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-medium"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email Support
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.sourceRefs && msg.sourceRefs.length > 0 && (
                        <>
                          <span>·</span>
                          <span>Source: {msg.sourceRefs.join(', ')}</span>
                        </>
                      )}
                      {msg.sender === 'assistant' && msg.id !== 'welcome-crm' && (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'up')}
                            aria-label="Helpful"
                            className={`p-0.5 rounded ${
                              msg.feedback === 'up'
                                ? 'text-[#3C9A35]'
                                : 'text-slate-400 hover:text-[#3C9A35]'
                            }`}
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'down')}
                            aria-label="Not helpful"
                            className={`p-0.5 rounded ${
                              msg.feedback === 'down'
                                ? 'text-red-600'
                                : 'text-slate-400 hover:text-red-600'
                            }`}
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
                  </div>
                )}

                {chatError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {chatError}
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendCrmMessage();
                }}
                className="border-t border-slate-200 p-3.5 bg-white flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={!botEnabled || chatLoading}
                  placeholder={
                    botEnabled
                      ? 'Ask about leads, customers, follow-ups, tickets, or CRM SOPs...'
                      : 'CRM Bot is currently disabled'
                  }
                  className="flex-1 text-sm px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1557B0]"
                />
                <button
                  type="submit"
                  disabled={!botEnabled || chatLoading || !input.trim()}
                  className="px-4 py-2 bg-[#1557B0] hover:bg-[#114690] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  Ask
                </button>
              </form>
            </div>
          </div>
        )}

        {subTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Demo Leads</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                  {leads.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Demo Customers</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#3C9A35] mt-1">
                  {customers.length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Active Follow-Ups</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#1557B0] mt-1">
                  {followUps.filter((f) => f.status !== 'Completed').length}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-xs text-slate-500">Unresolved Tickets</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
                  {tickets.filter((t) => t.status !== 'Resolved').length}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard chart={leadsBySourceChart} />
              <ChartCard chart={leadsByStageChart} />
              <ChartCard chart={acquisitionTrendChart} />
              <ChartCard chart={followUpStatusChart} />
              <ChartCard chart={ticketCategoryChart} />
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                    <BarChart3 className="w-4 h-4 text-[#1557B0]" />
                    Ask CRM Bot to Explain Any Report
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Every figure above is computed deterministically from your
                    role-scoped CRM records. Switch to CRM AI Chat to generate
                    natural-language executive summaries on demand.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('copilot');
                    sendCrmMessage('Generate a monthly performance report.');
                  }}
                  className="mt-4 px-4 py-2 bg-[#1557B0] hover:bg-[#114690] text-white text-xs font-medium rounded-lg w-fit"
                >
                  Summarize Monthly Performance in AI Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {subTab === 'explorer' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    ['leads', `Leads (${leads.length})`],
                    ['customers', `Customers (${customers.length})`],
                    ['followUps', `Follow-Ups (${followUps.length})`],
                    ['tickets', `Tickets (${tickets.length})`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setExplorerTab(key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      explorerTab === key
                        ? 'bg-white text-[#0F172A] shadow-sm'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search read-only records..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#1557B0]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {explorerTab === 'leads' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-2.5 font-semibold">ID</th>
                      <th className="px-4 py-2.5 font-semibold">Company</th>
                      <th className="px-4 py-2.5 font-semibold">Source</th>
                      <th className="px-4 py-2.5 font-semibold">Stage</th>
                      <th className="px-4 py-2.5 font-semibold">Owner</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Est. Value (₹)</th>
                      <th className="px-4 py-2.5 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-500">{l.id}</td>
                        <td className="px-4 py-2.5 font-medium text-[#0F172A]">{l.company}</td>
                        <td className="px-4 py-2.5 text-slate-600">{l.source}</td>
                        <td className="px-4 py-2.5 text-slate-700">{l.status}</td>
                        <td className="px-4 py-2.5 text-slate-600">{l.owner}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {l.estimatedValueInr.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{l.createdAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {explorerTab === 'customers' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-2.5 font-semibold">ID</th>
                      <th className="px-4 py-2.5 font-semibold">Company</th>
                      <th className="px-4 py-2.5 font-semibold">Industry</th>
                      <th className="px-4 py-2.5 font-semibold">Plan</th>
                      <th className="px-4 py-2.5 font-semibold">Manager</th>
                      <th className="px-4 py-2.5 font-semibold text-right">ACV (₹)</th>
                      <th className="px-4 py-2.5 font-semibold">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-500">{c.id}</td>
                        <td className="px-4 py-2.5 font-medium text-[#0F172A]">{c.company}</td>
                        <td className="px-4 py-2.5 text-slate-600">{c.industry}</td>
                        <td className="px-4 py-2.5 text-slate-700">{c.plan}</td>
                        <td className="px-4 py-2.5 text-slate-600">{c.accountManager}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {c.annualContractInr.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{c.registeredAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {explorerTab === 'followUps' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-2.5 font-semibold">ID</th>
                      <th className="px-4 py-2.5 font-semibold">Account</th>
                      <th className="px-4 py-2.5 font-semibold">Subject</th>
                      <th className="px-4 py-2.5 font-semibold">Owner</th>
                      <th className="px-4 py-2.5 font-semibold">Priority</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFollowUps.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-500">{f.id}</td>
                        <td className="px-4 py-2.5 font-medium text-[#0F172A]">{f.accountName}</td>
                        <td className="px-4 py-2.5 text-slate-700">{f.subject}</td>
                        <td className="px-4 py-2.5 text-slate-600">{f.owner}</td>
                        <td className="px-4 py-2.5 text-slate-700">{f.priority}</td>
                        <td className="px-4 py-2.5 text-slate-700">{f.status}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{f.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {explorerTab === 'tickets' && (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-2.5 font-semibold">ID</th>
                      <th className="px-4 py-2.5 font-semibold">Customer</th>
                      <th className="px-4 py-2.5 font-semibold">Category</th>
                      <th className="px-4 py-2.5 font-semibold">Subject</th>
                      <th className="px-4 py-2.5 font-semibold">Priority</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                      <th className="px-4 py-2.5 font-semibold text-right">SLA Left (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-slate-500">{t.id}</td>
                        <td className="px-4 py-2.5 font-medium text-[#0F172A]">{t.customer}</td>
                        <td className="px-4 py-2.5 text-slate-600">{t.category}</td>
                        <td className="px-4 py-2.5 text-slate-700">{t.subject}</td>
                        <td className="px-4 py-2.5 text-slate-700">{t.priority}</td>
                        <td className="px-4 py-2.5 text-slate-700">{t.status}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {t.slaHoursRemaining}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Read-Only CRM Demo Data Provider
              </span>
              <span>Write operations disabled by policy</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
