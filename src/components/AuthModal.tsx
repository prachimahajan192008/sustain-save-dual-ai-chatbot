import { KeyRound, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import type { SupportConfig } from '../types/platform';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  support: SupportConfig;
  title?: string;
}

export function AuthModal({ open, onClose, support, title }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Google sign-in was cancelled or blocked by popup settings.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A]/45 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A]">
              {title || 'Sustain & Save Workspace Sign In'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Sign in with your verified Google account to access role-protected CRM
              and Super Admin workspaces.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        {!showForgotHelp ? (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 bg-[#1557B0] hover:bg-[#114690] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Role assignments enforced server-side</span>
              <button
                type="button"
                onClick={() => setShowForgotHelp(true)}
                className="text-[#1557B0] hover:underline font-medium"
              >
                Forgot password / Access help?
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#0F172A]">
                <KeyRound className="w-4 h-4 text-[#1557B0]" />
                Account Recovery & CRM Role Provisioning
              </div>
              <p>
                Authentication uses verified Google Workspace SSO. To reset your Google
                account password, use Google Account Recovery. To request CRM Employee
                or CRM Admin permissions, contact NMD Pvt Ltd or your Super Admin:
              </p>
              <div className="pt-1 space-y-1 text-slate-600">
                <a
                  href={`tel:${support.supportPhone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-1.5 text-[#1557B0] hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {support.supportPhone}
                </a>
                <a
                  href={`mailto:${support.supportEmail}`}
                  className="flex items-center gap-1.5 text-[#1557B0] hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {support.supportEmail}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotHelp(false)}
              className="w-full py-2 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
