import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Lock,
  MessageSquare,
  PhoneCall,
  Plus,
  Search,
  Settings,
  Shield,
  Sliders,
  Trash2,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import type {
  AuditLogItem,
  BotConfig,
  BotType,
  ConversationSummary,
  EscalationItem,
  KnowledgeDoc,
  SupportConfig,
  TrainingQuestion,
  UserProfile,
  UserRole,
} from '../types/platform';
import { ChartCard } from './ChartCard';

export type AdminSection =
  | 'overview'
  | 'website_bot'
  | 'crm_bot'
  | 'website_kb'
  | 'crm_kb'
  | 'doc_training'
  | 'qa_training'
  | 'website_history'
  | 'crm_history'
  | 'escalations'
  | 'users'
  | 'analytics'
  | 'bot_config'
  | 'support_settings'
  | 'profile_settings';

interface AdminDashboardViewProps {
  userRole: UserRole | null;
  userName: string;
  userEmail: string;
  onOpenAuth: () => void;
  onSupportUpdated: (cfg: SupportConfig) => void;
  onPublicBotUpdated: () => void;
  onOpenWebsiteWidget: () => void;
  onNavigateCrm: () => void;
}

interface AnalyticsOverview {
  cards: {
    totalWebsiteConversations: number;
    totalCrmConversations: number;
    totalMessages: number;
    totalActiveUsers: number;
    totalKnowledgeDocuments: number;
    unansweredQuestions: number;
    escalatedConversations: number;
    totalAiTokens: number;
  };
  usage: {
    websiteTokens: number;
    crmTokens: number;
    websiteRequests: number;
    crmRequests: number;
    dailySeries: Array<{ date: string; website: number; crm: number }>;
    topQuestions: Array<{ question: string; botType: BotType; count: number }>;
  };
  botComparison: Array<{ name: string; value: number; tokens: number }>;
}

const NAV_ITEMS: Array<{
  id: AdminSection;
  label: string;
  icon: typeof LayoutDashboard;
  superAdminOnly?: boolean;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'website_bot', label: 'Website Bot', icon: MessageSquare, superAdminOnly: true },
  { id: 'crm_bot', label: 'CRM Bot', icon: Bot },
  { id: 'website_kb', label: 'Website Knowledge', icon: BookOpen, superAdminOnly: true },
  { id: 'crm_kb', label: 'CRM Knowledge', icon: Database },
  { id: 'doc_training', label: 'Document Training', icon: FileText },
  { id: 'qa_training', label: 'Q&A Training', icon: HelpCircle },
  { id: 'website_history', label: 'Website History', icon: History, superAdminOnly: true },
  { id: 'crm_history', label: 'CRM History', icon: History },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle },
  { id: 'users', label: 'User Management', icon: Users, superAdminOnly: true },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { id: 'bot_config', label: 'Bot Configuration', icon: Sliders },
  { id: 'support_settings', label: 'Support Settings', icon: PhoneCall, superAdminOnly: true },
  { id: 'profile_settings', label: 'Profile & Audit', icon: UserCog },
];

export function AdminDashboardView({
  userRole,
  userName,
  userEmail,
  onOpenAuth,
  onSupportUpdated,
  onPublicBotUpdated,
  onOpenWebsiteWidget,
  onNavigateCrm,
}: AdminDashboardViewProps) {
  const isAuthorized = userRole === 'SUPER_ADMIN' || userRole === 'CRM_ADMIN';
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [botConfigs, setBotConfigs] = useState<Partial<Record<BotType, BotConfig>>>({});
  const [supportConfig, setSupportConfig] = useState<SupportConfig | null>(null);

  const [selectedConv, setSelectedConv] = useState<ConversationSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Filters
  const [kbSearch, setKbSearch] = useState('');
  const [qaSearch, setQaSearch] = useState('');
  const [qaBotFilter, setQaBotFilter] = useState<'all' | BotType>(
    userRole === 'CRM_ADMIN' ? 'crm' : 'all'
  );
  const [qaCategoryFilter, setQaCategoryFilter] = useState('all');
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');

  // Document Upload Form
  const [uploadBot, setUploadBot] = useState<BotType>(
    userRole === 'CRM_ADMIN' ? 'crm' : 'website'
  );
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadSourceType, setUploadSourceType] = useState<'pdf' | 'docx' | 'txt' | 'custom'>('custom');
  const [uploadText, setUploadText] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);

  // Q&A Form
  const [qaFormBot, setQaFormBot] = useState<BotType>('crm');
  const [qaFormCategory, setQaFormCategory] = useState('Lead Analytics');
  const [qaFormQuestion, setQaFormQuestion] = useState('');
  const [qaFormAnswer, setQaFormAnswer] = useState('');
  const [editingQa, setEditingQa] = useState<TrainingQuestion | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkImportJson, setBulkImportJson] = useState('');

  // User Form
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('CRM_EMPLOYEE');
  const [newUserDept, setNewUserDept] = useState('Sales & CRM');

  // Config Tab
  const [configTab, setConfigTab] = useState<BotType>(
    userRole === 'CRM_ADMIN' ? 'crm' : 'website'
  );

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const authHeaders = async () => {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const loadAllAdminData = useCallback(async () => {
    if (!isAuthorized || !auth.currentUser) return;
    try {
      const headers = await authHeaders();
      const [
        analyticsRes,
        docsRes,
        qaRes,
        convRes,
        escRes,
        settingsRes,
      ] = await Promise.all([
        fetch('/api/admin/analytics', { headers }),
        fetch('/api/knowledge', { headers }),
        fetch('/api/training', { headers }),
        fetch('/api/admin/conversations', { headers }),
        fetch('/api/admin/escalations', { headers }),
        fetch('/api/settings', { headers }),
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (docsRes.ok) setDocs((await docsRes.json()).documents || []);
      if (qaRes.ok) setQuestions((await qaRes.json()).questions || []);
      if (convRes.ok) setConversations((await convRes.json()).conversations || []);
      if (escRes.ok) setEscalations((await escRes.json()).escalations || []);
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setBotConfigs(sData.botConfigs || {});
        setSupportConfig(sData.supportConfig || null);
      }

      if (userRole === 'SUPER_ADMIN') {
        const [usersRes, auditRes] = await Promise.all([
          fetch('/api/admin/users', { headers }),
          fetch('/api/admin/audit-logs', { headers }),
        ]);
        if (usersRes.ok) setUsers((await usersRes.json()).users || []);
        if (auditRes.ok) setAuditLogs((await auditRes.json()).logs || []);
      }
    } catch {
      // handled per section
    }
  }, [isAuthorized, userRole]);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  if (!isAuthorized) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#1557B0] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">
            Super Admin / CRM Admin Authorization Required
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            The Super Admin Dashboard governs knowledge bases, 100+ Q&amp;A training
            sets, user RBAC roles, Gemini settings, and escalation queues. Sign in
            with an authorized admin account to continue.
          </p>
          {userRole ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 max-w-md mx-auto">
              Current role ({userRole}) does not have Admin Dashboard privileges.
            </p>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-5 py-2.5 bg-[#1557B0] hover:bg-[#114690] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handlers
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const headers = await authHeaders();
      let base64Data = '';
      let fileName = '';
      let mimeType = '';
      let detectedSource = uploadSourceType;

      if (uploadFile) {
        fileName = uploadFile.name;
        mimeType = uploadFile.type;
        if (fileName.toLowerCase().endsWith('.pdf')) detectedSource = 'pdf';
        else if (fileName.toLowerCase().endsWith('.docx')) detectedSource = 'docx';
        else detectedSource = 'txt';

        const buf = await uploadFile.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          botType: uploadBot,
          title: uploadTitle || fileName || 'Untitled Document',
          category: uploadCategory,
          sourceType: detectedSource,
          content: uploadText,
          fileName,
          mimeType,
          base64Data,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      notify(`Indexed "${data.document.title}" (${data.document.chunkCount} chunks).`);
      setUploadTitle('');
      setUploadText('');
      setUploadFile(null);
      await loadAllAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleDoc = async (doc: KnowledgeDoc) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/knowledge/${doc.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ active: !doc.active }),
    });
    if (res.ok) {
      notify(`${doc.title} marked ${!doc.active ? 'active' : 'inactive'}.`);
      loadAllAdminData();
    }
  };

  const handleSaveDocEdit = async () => {
    if (!editingDoc) return;
    const headers = await authHeaders();
    const res = await fetch(`/api/knowledge/${editingDoc.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        title: editingDoc.title,
        category: editingDoc.category,
        content: editingDoc.content,
      }),
    });
    if (res.ok) {
      notify(`Updated "${editingDoc.title}".`);
      setEditingDoc(null);
      loadAllAdminData();
    }
  };

  const handleDeleteDoc = async (doc: KnowledgeDoc) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/knowledge/${doc.id}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      notify(`Deleted "${doc.title}".`);
      loadAllAdminData();
    }
  };

  const handleSaveQa = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = await authHeaders();
    if (editingQa) {
      const res = await fetch(`/api/training/${editingQa.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          category: qaFormCategory,
          question: qaFormQuestion,
          answer: qaFormAnswer,
        }),
      });
      if (res.ok) {
        notify('Updated training Q&A.');
        setEditingQa(null);
        setQaFormQuestion('');
        setQaFormAnswer('');
        loadAllAdminData();
      }
    } else {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          botType: qaFormBot,
          category: qaFormCategory,
          question: qaFormQuestion,
          answer: qaFormAnswer,
        }),
      });
      if (res.ok) {
        notify('Added approved training Q&A.');
        setQaFormQuestion('');
        setQaFormAnswer('');
        loadAllAdminData();
      }
    }
  };

  const handleBulkImportQa = async () => {
    try {
      const parsed = JSON.parse(bulkImportJson);
      const items = Array.isArray(parsed) ? parsed : [];
      const headers = await authHeaders();
      const res = await fetch('/api/training/import', {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      notify(`Imported ${data.importedCount} training examples.`);
      setBulkImportOpen(false);
      setBulkImportJson('');
      loadAllAdminData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Invalid JSON array format.');
    }
  };

  const handleToggleQa = async (qa: TrainingQuestion) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/training/${qa.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ active: !qa.active }),
    });
    if (res.ok) loadAllAdminData();
  };

  const handleDeleteQa = async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/training/${id}`, { method: 'DELETE', headers });
    if (res.ok) {
      notify('Deleted training Q&A.');
      loadAllAdminData();
    }
  };

  const handleUpdateEscalation = async (
    id: string,
    status: EscalationItem['status']
  ) => {
    const headers = await authHeaders();
    const res = await fetch(`/api/admin/escalations/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      notify(`Escalation marked ${status}.`);
      loadAllAdminData();
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = await authHeaders();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        displayName: newUserName,
        email: newUserEmail,
        role: newUserRole,
        department: newUserDept,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      notify(`Saved role ${data.user.role} for ${data.user.email}.`);
      setNewUserName('');
      setNewUserEmail('');
      loadAllAdminData();
    } else {
      notify(data.error || 'Failed to save user.');
    }
  };

  const handleSaveBotConfig = async (botType: BotType) => {
    const cfg = botConfigs[botType];
    if (!cfg) return;
    const headers = await authHeaders();
    const res = await fetch(`/api/settings/bot/${botType}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(cfg),
    });
    if (res.ok) {
      notify(`Saved ${botType.toUpperCase()} Bot configuration.`);
      onPublicBotUpdated();
      loadAllAdminData();
    }
  };

  const handleSaveSupportConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportConfig) return;
    const headers = await authHeaders();
    const res = await fetch('/api/settings/support', {
      method: 'PUT',
      headers,
      body: JSON.stringify(supportConfig),
    });
    const data = await res.json();
    if (res.ok) {
      notify('Updated NMD Pvt Ltd Support Settings.');
      onSupportUpdated(data.supportConfig);
    }
  };

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.superAdminOnly || userRole === 'SUPER_ADMIN'
  );

  const renderKnowledgeTable = (targetBot: BotType) => {
    const filtered = docs.filter(
      (d) =>
        d.botType === targetBot &&
        (!kbSearch ||
          d.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
          d.category.toLowerCase().includes(kbSearch.toLowerCase()))
    );
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              {targetBot === 'website'
                ? 'Website Bot Knowledge Base (Isolated)'
                : 'CRM Bot Knowledge Base (Isolated)'}
            </h2>
            <p className="text-xs text-slate-500">
              {filtered.length} documents indexed · Never mixed with{' '}
              {targetBot === 'website' ? 'CRM' : 'Website'} Bot
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={kbSearch}
                onChange={(e) => setKbSearch(e.target.value)}
                placeholder="Search docs..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setUploadBot(targetBot);
                setSection('doc_training');
              }}
              className="px-3 py-1.5 bg-[#1557B0] text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Document
            </button>
          </div>
        </div>

        {editingDoc && editingDoc.botType === targetBot && (
          <div className="bg-white border border-[#1557B0] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Edit Document: {editingDoc.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={editingDoc.title}
                onChange={(e) =>
                  setEditingDoc({ ...editingDoc, title: e.target.value })
                }
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                value={editingDoc.category}
                onChange={(e) =>
                  setEditingDoc({ ...editingDoc, category: e.target.value })
                }
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <textarea
              rows={5}
              value={editingDoc.content}
              onChange={(e) =>
                setEditingDoc({ ...editingDoc, content: e.target.value })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDocEdit}
                className="px-4 py-1.5 bg-[#1557B0] text-white text-xs font-medium rounded-lg"
              >
                Save &amp; Re-Index
              </button>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-1.5 border border-slate-200 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="px-4 py-2.5 font-semibold">Title</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">Format</th>
                <th className="px-4 py-2.5 font-semibold text-right">Chunks</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-[#0F172A]">{doc.title}</td>
                  <td className="px-4 py-3 text-slate-600">{doc.category}</td>
                  <td className="px-4 py-3 font-mono uppercase text-slate-500">
                    {doc.sourceType}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {doc.chunkCount}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleDoc(doc)}
                      className={`text-xs font-medium ${
                        doc.active ? 'text-[#3C9A35]' : 'text-slate-400'
                      }`}
                    >
                      {doc.active ? 'Active · Indexed' : 'Disabled'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingDoc(doc)}
                      className="text-[#1557B0] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No knowledge documents match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderChatHistory = (targetBot: BotType) => {
    const list = conversations.filter(
      (c) =>
        c.botType === targetBot &&
        (!historySearch ||
          c.title.toLowerCase().includes(historySearch.toLowerCase()) ||
          c.ownerLabel.toLowerCase().includes(historySearch.toLowerCase()) ||
          c.lastMessagePreview.toLowerCase().includes(historySearch.toLowerCase())) &&
        (!historyDate || c.createdAt.startsWith(historyDate))
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A]">
              {targetBot === 'website'
                ? 'Website Bot Chat History'
                : 'CRM Bot Chat History'}
            </h2>
            <p className="text-xs text-slate-500">
              Stored separately from {targetBot === 'website' ? 'CRM' : 'Website'} threads
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search topic or user..."
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            />
            <input
              type="date"
              value={historyDate}
              onChange={(e) => setHistoryDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
            {list.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                  selectedConv?.id === conv.id ? 'bg-slate-50' : ''
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium text-[#0F172A]">{conv.ownerLabel}</span>
                  <span className="font-mono tabular-nums">
                    {conv.createdAt.slice(0, 10)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#0F172A] mt-1 truncate">
                  {conv.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {conv.lastMessagePreview}
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{conv.messageCount} messages</span>
                  <span>·</span>
                  <span
                    className={
                      conv.status === 'escalated' ? 'text-amber-700 font-medium' : ''
                    }
                  >
                    {conv.status}
                  </span>
                </div>
              </button>
            ))}
            {list.length === 0 && (
              <p className="p-6 text-xs text-center text-slate-500">
                No conversations match the current filter.
              </p>
            )}
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 min-h-[360px]">
            {selectedConv && selectedConv.botType === targetBot ? (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      {selectedConv.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      ID: {selectedConv.id} · {selectedConv.ownerLabel}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    {selectedConv.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto">
                  {(selectedConv.messages || []).map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg text-xs ${
                        m.sender === 'user'
                          ? 'bg-[#1557B0]/10 text-[#0F172A] ml-8'
                          : 'bg-slate-50 border border-slate-200 text-[#0F172A] mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold">
                          {m.sender === 'user' ? 'User' : 'AI Assistant'}
                        </span>
                        <span className="font-mono tabular-nums">
                          {new Date(m.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Select a conversation thread to inspect full messages and timestamps.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const qaCategories = Array.from(new Set(questions.map((q) => q.category)));
  const filteredQa = questions.filter((q) => {
    const matchBot = qaBotFilter === 'all' || q.botType === qaBotFilter;
    const matchCat = qaCategoryFilter === 'all' || q.category === qaCategoryFilter;
    const matchText =
      !qaSearch ||
      q.question.toLowerCase().includes(qaSearch.toLowerCase()) ||
      q.answer.toLowerCase().includes(qaSearch.toLowerCase());
    return matchBot && matchCat && matchText;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex">
      {/* Collapsible Sidebar */}
      <aside
        className={`bg-white border-r border-slate-200 shrink-0 transition-all duration-150 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <span className="text-xs font-semibold text-slate-500 px-2">
              Admin Navigation
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="p-1.5 text-slate-500 hover:text-[#0F172A] hover:bg-slate-100 rounded-lg ml-auto"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#1557B0] text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#0F172A]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs text-slate-500">
              Super Admin Control Plane · {userRole}
            </p>
            <h1 className="text-xl font-bold text-[#0F172A]">
              {NAV_ITEMS.find((n) => n.id === section)?.label}
            </h1>
          </div>
          {toast && (
            <div className="px-3.5 py-2 bg-[#0F172A] text-white text-xs rounded-lg shadow-sm">
              {toast}
            </div>
          )}
        </div>

        {/* 1. OVERVIEW */}
        {section === 'overview' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Website Conversations', analytics.cards.totalWebsiteConversations],
                ['CRM Conversations', analytics.cards.totalCrmConversations],
                ['Total Messages', analytics.cards.totalMessages],
                ['Active Users', analytics.cards.totalActiveUsers],
                ['Knowledge Documents', analytics.cards.totalKnowledgeDocuments],
                ['Unanswered Questions', analytics.cards.unansweredQuestions],
                ['Open Escalations', analytics.cards.escalatedConversations],
                ['AI Tokens Used', analytics.cards.totalAiTokens.toLocaleString()],
              ].map(([label, val]) => (
                <div
                  key={String(label)}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A] mt-1">
                    {val}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                chart={{
                  type: 'line',
                  title: 'Daily Conversations — Website vs CRM',
                  subtitle: '6-day conversation volume',
                  valueLabel: 'Website Bot',
                  secondaryLabel: 'CRM Bot',
                  data: analytics.usage.dailySeries.map((d) => ({
                    name: d.date,
                    value: d.website,
                    secondary: d.crm,
                  })),
                }}
              />
              <ChartCard
                chart={{
                  type: 'pie',
                  title: 'AI Token Usage Share (Quotation 1M/bot budget)',
                  subtitle: `Website: ${analytics.usage.websiteTokens.toLocaleString()} · CRM: ${analytics.usage.crmTokens.toLocaleString()}`,
                  valueLabel: 'Tokens',
                  data: [
                    { name: 'Website Bot Tokens', value: analytics.usage.websiteTokens },
                    { name: 'CRM Bot Tokens', value: analytics.usage.crmTokens },
                  ],
                }}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">
                Most Asked Questions
              </h3>
              <div className="divide-y divide-slate-100">
                {analytics.usage.topQuestions.slice(0, 6).map((item, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <span className="text-[#0F172A] font-medium truncate">
                      {item.question}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 text-slate-500">
                      <span className="uppercase font-mono">{item.botType}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. WEBSITE BOT MANAGEMENT */}
        {section === 'website_bot' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#0F172A]">
                Bot 1 — Website Frontend Status
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Public-facing AI assistant trained exclusively on Sustain &amp; Save
                website pages, product catalogs, pricing, policies, and FAQs. Never
                guesses outside approved context.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Status</p>
                  <p className="font-semibold text-[#3C9A35] mt-0.5">
                    {botConfigs.website?.enabled ? 'Enabled (24/7)' : 'Disabled'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Indexed Website Docs</p>
                  <p className="font-mono font-semibold text-[#0F172A] mt-0.5">
                    {docs.filter((d) => d.botType === 'website').length}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={onOpenWebsiteWidget}
                  className="px-4 py-2 bg-[#1557B0] text-white text-xs font-medium rounded-lg"
                >
                  Open Live Website Widget
                </button>
                <button
                  type="button"
                  onClick={() => setSection('website_kb')}
                  className="px-4 py-2 border border-slate-200 text-xs font-medium rounded-lg"
                >
                  Manage Website KB
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 text-xs text-slate-600">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Smart Escalation Channels Active
              </h3>
              <p>· Call Support: {supportConfig?.supportPhone}</p>
              <p>· WhatsApp Support: {supportConfig?.whatsappNumber}</p>
              <p>· Email Support: {supportConfig?.supportEmail}</p>
              <p>· Contact Portal: {supportConfig?.contactUrl}</p>
            </div>
          </div>
        )}

        {/* 3. CRM BOT MANAGEMENT */}
        {section === 'crm_bot' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-[#0F172A]">
                Bot 2 — Internal CRM Copilot Status
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strictly authenticated internal AI assistant connected to the
                read-only CRM data provider and isolated CRM User Guide &amp; SOP
                knowledge base.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Data Access Mode</p>
                  <p className="font-semibold text-[#3C9A35] mt-0.5">
                    Read-Only (DEMO Provider)
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Trained CRM Q&amp;As</p>
                  <p className="font-mono font-semibold text-[#0F172A] mt-0.5">
                    {questions.filter((q) => q.botType === 'crm').length}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={onNavigateCrm}
                  className="px-4 py-2 bg-[#3C9A35] text-white text-xs font-medium rounded-lg"
                >
                  Launch CRM Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQaBotFilter('crm');
                    setSection('qa_training');
                  }}
                  className="px-4 py-2 border border-slate-200 text-xs font-medium rounded-lg"
                >
                  Inspect 100 CRM Q&amp;As
                </button>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2 text-xs text-slate-600">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Verified Read-Only Datasets (DEMO)
              </h3>
              <p>· 50 Sample Leads across 6 acquisition channels</p>
              <p>· 30 Sample Customers across 3 sustainability tiers</p>
              <p>· 20 Sample Follow-Up tasks with overdue tracking</p>
              <p>· 15 Sample Support Tickets with SLA timers</p>
            </div>
          </div>
        )}

        {/* 4 & 5. KNOWLEDGE BASES */}
        {section === 'website_kb' && renderKnowledgeTable('website')}
        {section === 'crm_kb' && renderKnowledgeTable('crm')}

        {/* 6. DOCUMENT TRAINING */}
        {section === 'doc_training' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleUploadDocument}
              className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <h2 className="text-base font-semibold text-[#0F172A]">
                Upload &amp; Vector-Index Knowledge Document
              </h2>
              <p className="text-xs text-slate-500">
                Supports PDF, DOCX, TXT/MD files or direct custom text. Text is
                extracted server-side, chunked, and embedded using Gemini Embedding 2.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Target Knowledge Base
                  </label>
                  <select
                    value={uploadBot}
                    onChange={(e) => setUploadBot(e.target.value as BotType)}
                    disabled={userRole !== 'SUPER_ADMIN'}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {userRole === 'SUPER_ADMIN' && (
                      <option value="website">Bot 1 — Website Knowledge Base</option>
                    )}
                    <option value="crm">Bot 2 — CRM Knowledge Base</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    placeholder="e.g. Policies, SOPs, Product Guide"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required={!uploadFile}
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Upload File (.pdf, .docx, .txt, .md)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                    if (file && !uploadTitle) setUploadTitle(file.name);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:text-xs file:font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Or Paste Custom Training Text
                </label>
                <textarea
                  rows={6}
                  value={uploadText}
                  onChange={(e) => {
                    setUploadText(e.target.value);
                    setUploadSourceType('custom');
                  }}
                  placeholder="Paste approved policy text, product specs, or CRM SOP procedures..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2.5 bg-[#1557B0] hover:bg-[#114690] disabled:opacity-60 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {busy ? 'Processing & Embedding...' : 'Process & Index Document'}
              </button>
            </form>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-3 text-xs text-slate-600">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                RAG Processing Pipeline
              </h3>
              <p>1. Extract clean text from PDF (Gemini multimodal), DOCX (Mammoth), or TXT.</p>
              <p>2. Split text into overlapping 750-character semantic chunks.</p>
              <p>3. Generate vector embeddings with Gemini Embedding 2.</p>
              <p>4. Store strictly inside the selected bot&apos;s isolated index.</p>
              <p>5. Cite source document titles in every grounded bot reply.</p>
            </div>
          </div>
        )}

        {/* 7. Q&A TRAINING */}
        {section === 'qa_training' && (
          <div className="space-y-5">
            <form
              onSubmit={handleSaveQa}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  {editingQa ? 'Edit Training Q&A' : 'Add Approved Training Question & Answer'}
                </h2>
                <button
                  type="button"
                  onClick={() => setBulkImportOpen((v) => !v)}
                  className="text-xs text-[#1557B0] hover:underline font-medium"
                >
                  {bulkImportOpen ? 'Close Bulk Import' : 'Bulk Import JSON'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={qaFormBot}
                  disabled={userRole !== 'SUPER_ADMIN' || Boolean(editingQa)}
                  onChange={(e) => setQaFormBot(e.target.value as BotType)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="crm">CRM Bot</option>
                  {userRole === 'SUPER_ADMIN' && (
                    <option value="website">Website Bot</option>
                  )}
                </select>
                <input
                  type="text"
                  required
                  value={qaFormCategory}
                  onChange={(e) => setQaFormCategory(e.target.value)}
                  placeholder="Category"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg sm:col-span-2"
                />
              </div>

              <input
                type="text"
                required
                value={qaFormQuestion}
                onChange={(e) => setQaFormQuestion(e.target.value)}
                placeholder="Approved training question"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
              <textarea
                rows={3}
                required
                value={qaFormAnswer}
                onChange={(e) => setQaFormAnswer(e.target.value)}
                placeholder="Verified answer"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1557B0] text-white text-xs font-medium rounded-lg"
                >
                  {editingQa ? 'Update Q&A' : 'Save Training Pair'}
                </button>
                {editingQa && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQa(null);
                      setQaFormQuestion('');
                      setQaFormAnswer('');
                    }}
                    className="px-4 py-2 border border-slate-200 text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {bulkImportOpen && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <p className="text-xs text-slate-600">
                  Paste a JSON array of objects with{' '}
                  <code>botType, category, question, answer</code>:
                </p>
                <textarea
                  rows={4}
                  value={bulkImportJson}
                  onChange={(e) => setBulkImportJson(e.target.value)}
                  placeholder='[{"botType":"crm","category":"Lead SOP","question":"...","answer":"..."}]'
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleBulkImportQa}
                  className="px-4 py-2 bg-[#3C9A35] text-white text-xs font-medium rounded-lg"
                >
                  Import JSON Batch
                </button>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[#0F172A]">
                  Showing {filteredQa.length} of {questions.length} approved training pairs
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {userRole === 'SUPER_ADMIN' && (
                    <select
                      value={qaBotFilter}
                      onChange={(e) => setQaBotFilter(e.target.value as 'all' | BotType)}
                      className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="all">All Bots</option>
                      <option value="crm">CRM Bot (100+)</option>
                      <option value="website">Website Bot</option>
                    </select>
                  )}
                  <select
                    value={qaCategoryFilter}
                    onChange={(e) => setQaCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="all">All Categories</option>
                    {qaCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={qaSearch}
                    onChange={(e) => setQaSearch(e.target.value)}
                    placeholder="Search Q&A..."
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {filteredQa.map((qa) => (
                  <div key={qa.id} className="p-4 hover:bg-slate-50/70 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        <strong className="uppercase text-[#1557B0]">{qa.botType}</strong>{' '}
                        · {qa.category}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleQa(qa)}
                          className={qa.active ? 'text-[#3C9A35]' : 'text-slate-400'}
                        >
                          {qa.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQa(qa);
                            setQaFormBot(qa.botType);
                            setQaFormCategory(qa.category);
                            setQaFormQuestion(qa.question);
                            setQaFormAnswer(qa.answer);
                          }}
                          className="text-[#1557B0] hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQa(qa.id)}
                          aria-label="Delete Q&A"
                          className="text-red-600 hover:underline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-[#0F172A]">{qa.question}</p>
                    <p className="text-xs text-slate-600">{qa.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8 & 9. CHAT HISTORIES */}
        {section === 'website_history' && renderChatHistory('website')}
        {section === 'crm_history' && renderChatHistory('crm')}

        {/* 10. ESCALATION MANAGEMENT */}
        {section === 'escalations' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-2.5 font-semibold">Bot</th>
                  <th className="px-4 py-2.5 font-semibold">Visitor / Employee</th>
                  <th className="px-4 py-2.5 font-semibold">Unanswered Question</th>
                  <th className="px-4 py-2.5 font-semibold">Channel</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Update</th>
                </tr>
              </thead>
              <tbody>
                {escalations.map((esc) => (
                  <tr key={esc.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono uppercase">{esc.botType}</td>
                    <td className="px-4 py-3 text-slate-700">{esc.ownerLabel}</td>
                    <td className="px-4 py-3 text-[#0F172A] max-w-md">{esc.question}</td>
                    <td className="px-4 py-3 uppercase font-mono text-slate-500">
                      {esc.channel}
                    </td>
                    <td className="px-4 py-3 font-medium">{esc.status}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateEscalation(esc.id, 'in_review')}
                        className="text-[#1557B0] hover:underline"
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateEscalation(esc.id, 'resolved')}
                        className="text-[#3C9A35] hover:underline"
                      >
                        Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 11. USER MANAGEMENT */}
        {section === 'users' && (
          <div className="space-y-5">
            <form
              onSubmit={handleSaveUser}
              className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
            >
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Assign Employee or Admin Role (RBAC)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Google Account Email"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="CRM_EMPLOYEE">CRM_EMPLOYEE</option>
                  <option value="CRM_ADMIN">CRM_ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="WEBSITE_VISITOR">WEBSITE_VISITOR</option>
                </select>
                <input
                  type="text"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  placeholder="Department"
                  className="px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1557B0] text-white text-xs font-medium rounded-lg"
              >
                Save Role Assignment
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 font-semibold">Role</th>
                    <th className="px-4 py-2.5 font-semibold">Department</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.uid} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-[#0F172A]">
                        {u.displayName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[#1557B0]">
                        {u.role}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.department || '—'}</td>
                      <td className="px-4 py-3 text-[#3C9A35]">{u.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 12. ANALYTICS & REPORTS */}
        {section === 'analytics' && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              chart={{
                type: 'bar',
                title: 'Website vs CRM Conversation Volume',
                valueLabel: 'Conversations',
                data: analytics.botComparison.map((b) => ({
                  name: b.name,
                  value: b.value,
                })),
              }}
            />
            <ChartCard
              chart={{
                type: 'line',
                title: 'Daily AI Usage Trend',
                valueLabel: 'Website',
                secondaryLabel: 'CRM',
                data: analytics.usage.dailySeries.map((d) => ({
                  name: d.date,
                  value: d.website,
                  secondary: d.crm,
                })),
              }}
            />
            <ChartCard
              chart={{
                type: 'pie',
                title: 'Escalation Resolution Status',
                valueLabel: 'Tickets',
                data: [
                  {
                    name: 'Open',
                    value: escalations.filter((e) => e.status === 'open').length,
                  },
                  {
                    name: 'In Review',
                    value: escalations.filter((e) => e.status === 'in_review').length,
                  },
                  {
                    name: 'Resolved',
                    value: escalations.filter((e) => e.status === 'resolved').length,
                  },
                ],
              }}
            />
            <ChartCard
              chart={{
                type: 'bar',
                title: 'Knowledge Assets by Bot',
                valueLabel: 'Documents',
                data: [
                  {
                    name: 'Website Docs',
                    value: docs.filter((d) => d.botType === 'website').length,
                  },
                  {
                    name: 'CRM Docs',
                    value: docs.filter((d) => d.botType === 'crm').length,
                  },
                  {
                    name: 'CRM Q&As',
                    value: questions.filter((q) => q.botType === 'crm').length,
                  },
                ],
              }}
            />
          </div>
        )}

        {/* 13. BOT CONFIGURATION (INDEPENDENT) */}
        {section === 'bot_config' && (
          <div className="space-y-4">
            {userRole === 'SUPER_ADMIN' && (
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setConfigTab('website')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                    configTab === 'website'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Bot 1: Website Bot Settings
                </button>
                <button
                  type="button"
                  onClick={() => setConfigTab('crm')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                    configTab === 'crm'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Bot 2: CRM Bot Settings
                </button>
              </div>
            )}

            {botConfigs[configTab] && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-3xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#0F172A]">
                    {configTab === 'website'
                      ? 'Independent Website Bot Configuration'
                      : 'Independent CRM Bot Configuration'}
                  </h2>
                  <label className="inline-flex items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={botConfigs[configTab]!.enabled}
                      onChange={(e) =>
                        setBotConfigs({
                          ...botConfigs,
                          [configTab]: {
                            ...botConfigs[configTab]!,
                            enabled: e.target.checked,
                          },
                        })
                      }
                    />
                    Bot Enabled
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Bot Name
                    </label>
                    <input
                      type="text"
                      value={botConfigs[configTab]!.botName}
                      onChange={(e) =>
                        setBotConfigs({
                          ...botConfigs,
                          [configTab]: {
                            ...botConfigs[configTab]!,
                            botName: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Gemini Model
                    </label>
                    <select
                      value={botConfigs[configTab]!.model}
                      onChange={(e) =>
                        setBotConfigs({
                          ...botConfigs,
                          [configTab]: {
                            ...botConfigs[configTab]!,
                            model: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="gemini-4-hydrogen">
                        Gemini Flash (gemini-4-hydrogen)
                      </option>
                      <option value="gemini-3.1-flash-lite">
                        Gemini Flash Lite (gemini-3.1-flash-lite)
                      </option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Max Response Length (chars)
                    </label>
                    <input
                      type="number"
                      min={200}
                      max={4000}
                      value={botConfigs[configTab]!.maxResponseLength}
                      onChange={(e) =>
                        setBotConfigs({
                          ...botConfigs,
                          [configTab]: {
                            ...botConfigs[configTab]!,
                            maxResponseLength: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Knowledge Base ID
                    </label>
                    <input
                      type="text"
                      value={botConfigs[configTab]!.knowledgeBaseId}
                      onChange={(e) =>
                        setBotConfigs({
                          ...botConfigs,
                          [configTab]: {
                            ...botConfigs[configTab]!,
                            knowledgeBaseId: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Welcome Message
                  </label>
                  <textarea
                    rows={2}
                    value={botConfigs[configTab]!.welcomeMessage}
                    onChange={(e) =>
                      setBotConfigs({
                        ...botConfigs,
                        [configTab]: {
                          ...botConfigs[configTab]!,
                          welcomeMessage: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    System Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={botConfigs[configTab]!.systemInstructions}
                    onChange={(e) =>
                      setBotConfigs({
                        ...botConfigs,
                        [configTab]: {
                          ...botConfigs[configTab]!,
                          systemInstructions: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveBotConfig(configTab)}
                  className="px-4 py-2 bg-[#1557B0] hover:bg-[#114690] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Save {configTab.toUpperCase()} Bot Settings
                </button>
              </div>
            )}
          </div>
        )}

        {/* 14. SUPPORT SETTINGS (NMD PVT LTD) */}
        {section === 'support_settings' && supportConfig && (
          <form
            onSubmit={handleSaveSupportConfig}
            className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 max-w-3xl"
          >
            <h2 className="text-base font-semibold text-[#0F172A]">
              Support &amp; Smart Escalation Contact Settings (NMD Pvt Ltd)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Support Organization Name
                </label>
                <input
                  type="text"
                  value={supportConfig.companyName}
                  onChange={(e) =>
                    setSupportConfig({ ...supportConfig, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Support Phone
                </label>
                <input
                  type="text"
                  value={supportConfig.supportPhone}
                  onChange={(e) =>
                    setSupportConfig({ ...supportConfig, supportPhone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp Number (digits with country code)
                </label>
                <input
                  type="text"
                  value={supportConfig.whatsappNumber}
                  onChange={(e) =>
                    setSupportConfig({
                      ...supportConfig,
                      whatsappNumber: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={supportConfig.supportEmail}
                  onChange={(e) =>
                    setSupportConfig({ ...supportConfig, supportEmail: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Head Office (Pune)
              </label>
              <input
                type="text"
                value={supportConfig.headOffice}
                onChange={(e) =>
                  setSupportConfig({ ...supportConfig, headOffice: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Branch Office (Pune)
              </label>
              <input
                type="text"
                value={supportConfig.branchOffice}
                onChange={(e) =>
                  setSupportConfig({ ...supportConfig, branchOffice: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contact Portal URL
              </label>
              <input
                type="url"
                value={supportConfig.contactUrl}
                onChange={(e) =>
                  setSupportConfig({ ...supportConfig, contactUrl: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-[#3C9A35] hover:bg-[#32822c] text-white text-xs font-semibold rounded-lg"
            >
              Update Contact Details Everywhere
            </button>
          </form>
        )}

        {/* 15. PROFILE & AUDIT SETTINGS */}
        {section === 'profile_settings' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Shield className="w-4 h-4 text-[#3C9A35]" />
                Authenticated Workspace Profile
              </div>
              <p className="text-xs text-slate-600">Name: {userName}</p>
              <p className="text-xs text-slate-600">Email: {userEmail}</p>
              <p className="text-xs font-mono text-[#1557B0]">Role: {userRole}</p>
            </div>

            {userRole === 'SUPER_ADMIN' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                  <Activity className="w-4 h-4 text-[#1557B0]" />
                  Security &amp; Administrative Audit Logs
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <th className="px-4 py-2 font-semibold">Timestamp</th>
                      <th className="px-4 py-2 font-semibold">Action</th>
                      <th className="px-4 py-2 font-semibold">Target</th>
                      <th className="px-4 py-2 font-semibold">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-[#0F172A]">
                          {log.action}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">{log.target}</td>
                        <td className="px-4 py-2.5 text-slate-600">{log.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
