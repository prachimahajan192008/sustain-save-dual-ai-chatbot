import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { CrmWorkspaceView } from './components/CrmWorkspaceView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicWebsiteView } from './components/PublicWebsiteView';
import { WebsiteBotWidget } from './components/WebsiteBotWidget';
import {
  auth,
  signOutFirebase,
  syncAuthenticatedUserProfile,
} from './lib/firebase';
import type { SupportConfig, UserRole } from './types/platform';

type ActiveSection = 'public' | 'crm' | 'admin';

const DEFAULT_SUPPORT: SupportConfig = {
  companyName: 'NMD Pvt Ltd · Sustain & Save Support',
  supportPhone: '+91 8830498811',
  whatsappNumber: '918830498811',
  supportEmail: 'nmdpvtltd@gmail.com',
  headOffice:
    'Office No.11, Second Floor, NMD PVT LTD, Aditya Centeegra, Fergusson College Rd, Shivajinagar, Pune, Maharashtra 411004',
  branchOffice:
    'Office No.202, Mantri House, Fergusson College Rd, Shivajinagar, Pune, Maharashtra 411005',
  contactUrl: 'https://thedigitalnmd.com/contact',
};

function PlatformShell() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('public');
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('Guest');
  const [userEmail, setUserEmail] = useState<string>('');
  const [authReady, setAuthReady] = useState(false);

  const [botName, setBotName] = useState('Sustain & Save Assistant');
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Welcome to Sustain & Save! Ask me about our energy monitoring hardware, sustainability programs, business policies, pricing, or support.'
  );
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([
    'What does Sustain & Save do?',
    'Compare your sustainability plans and savings',
    'What is your EM-100 hardware warranty and SLA?',
    'How can I contact NMD Pvt Ltd support?',
  ]);
  const [websiteBotEnabled, setWebsiteBotEnabled] = useState(true);
  const [supportConfig, setSupportConfig] = useState<SupportConfig>(DEFAULT_SUPPORT);

  const loadPublicBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/public/bootstrap');
      if (!res.ok) return;
      const data = await res.json();
      if (data.bot) {
        setBotName(data.bot.botName);
        setWelcomeMessage(data.bot.welcomeMessage);
        setSuggestedQuestions(data.bot.suggestedQuestions || []);
        setWebsiteBotEnabled(Boolean(data.bot.enabled));
      }
      if (data.support) {
        setSupportConfig(data.support);
      }
    } catch {
      // retain defaults
    }
  }, []);

  useEffect(() => {
    loadPublicBootstrap();
  }, [loadPublicBootstrap]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserRole(null);
        setUserName('Guest');
        setUserEmail('');
        setAuthReady(true);
        return;
      }

      try {
        await syncAuthenticatedUserProfile(user);
        const token = await user.getIdToken();
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUserRole(data.user.role);
          setUserName(data.user.displayName || user.displayName || 'User');
          setUserEmail(data.user.email || user.email || '');
        } else {
          setUserRole('WEBSITE_VISITOR');
          setUserName(user.displayName || 'Visitor');
          setUserEmail(user.email || '');
        }
      } catch {
        setUserRole('WEBSITE_VISITOR');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Logo & Single-line Wordmark */}
          <button
            type="button"
            onClick={() => setActiveSection('public')}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {!logoFailed ? (
              <img
                src="/src/assets/images/sustain_save_logo_1795548412643.jpg"
                alt="Sustain & Save logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-8 h-8 rounded-lg object-contain shrink-0"
              />
            ) : (
              <span className="w-8 h-8 rounded-lg bg-[#1557B0] text-white text-xs font-bold flex items-center justify-center shrink-0">
                S&amp;S
              </span>
            )}
            <span>Sustain &amp; Save</span>
          </button>

          {/* Zone 2: Clean single-line nav links */}
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSection('public')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeSection === 'public'
                  ? 'text-[#1557B0] border-b-2 border-[#1557B0]'
                  : 'hover:text-[#0F172A]'
              }`}
            >
              Public Website
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('crm')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeSection === 'crm'
                  ? 'text-[#3C9A35] border-b-2 border-[#3C9A35]'
                  : 'hover:text-[#0F172A]'
              }`}
            >
              CRM Copilot
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('admin')}
              className={`whitespace-nowrap shrink-0 pb-0.5 transition-colors cursor-pointer ${
                activeSection === 'admin'
                  ? 'text-[#1557B0] border-b-2 border-[#1557B0]'
                  : 'hover:text-[#0F172A]'
              }`}
            >
              Admin Dashboard
            </button>
            <a
              href={supportConfig.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-block whitespace-nowrap shrink-0 hover:text-[#0F172A] transition-colors"
            >
              Support Contact
            </a>
          </nav>

          {/* Zone 3: Single primary auth action */}
          <div className="flex items-center gap-3 shrink-0">
            {authReady && firebaseUser ? (
              <button
                type="button"
                onClick={() => signOutFirebase()}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out ({userRole === 'SUPER_ADMIN' ? 'Admin' : userName.split(' ')[0]})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1557B0] hover:bg-[#114690] rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Employee Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <div className="flex-1">
        {activeSection === 'public' && (
          <PublicWebsiteView
            support={supportConfig}
            onOpenWebsiteChat={() => setWidgetOpen(true)}
            onNavigateWorkspace={(tab) => setActiveSection(tab)}
          />
        )}

        {activeSection === 'crm' && (
          <CrmWorkspaceView
            userRole={userRole}
            userName={userName}
            onOpenAuth={() => setAuthModalOpen(true)}
            support={supportConfig}
          />
        )}

        {activeSection === 'admin' && (
          <AdminDashboardView
            userRole={userRole}
            userName={userName}
            userEmail={userEmail}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSupportUpdated={(cfg) => setSupportConfig(cfg)}
            onPublicBotUpdated={loadPublicBootstrap}
            onOpenWebsiteWidget={() => {
              setActiveSection('public');
              setWidgetOpen(true);
            }}
            onNavigateCrm={() => setActiveSection('crm')}
          />
        )}
      </div>

      {/* Bot 1 Floating Public Website Widget */}
      <WebsiteBotWidget
        botName={botName}
        welcomeMessage={welcomeMessage}
        suggestedQuestions={suggestedQuestions}
        enabled={websiteBotEnabled}
        support={supportConfig}
        externalOpen={widgetOpen}
        onExternalOpenChange={setWidgetOpen}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        support={supportConfig}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PlatformShell />
    </ErrorBoundary>
  );
}
