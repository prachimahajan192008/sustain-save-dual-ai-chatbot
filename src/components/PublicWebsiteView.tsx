import {
  ArrowRight,
  Building2,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { useState } from 'react';
import type { SupportConfig } from '../types/platform';

interface PublicWebsiteViewProps {
  support: SupportConfig;
  onOpenWebsiteChat: () => void;
  onNavigateWorkspace: (tab: 'crm' | 'admin') => void;
}

export function PublicWebsiteView({
  support,
  onOpenWebsiteChat,
  onNavigateWorkspace,
}: PublicWebsiteViewProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const telHref = `tel:${support.supportPhone.replace(/\s+/g, '')}`;
  const waHref = `https://wa.me/${support.whatsappNumber.replace(/[^0-9]/g, '')}`;
  const mailHref = `mailto:${support.supportEmail}`;

  return (
    <div className="bg-white text-[#0F172A]">
      {/* Hero Split */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-[#3C9A35] tracking-wide">
                Sustain &amp; Save · Industrial Energy &amp; Dual AI Platform
              </p>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#0F172A] leading-[1.12] [text-wrap:balance]">
                Cut facility energy waste and serve customers 24/7 with verified AI.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Sustain &amp; Save pairs EM-100 power telemetry and Scope 2 ESG
                advisory with an isolated Dual AI Chatbot Platform engineered by NMD
                Pvt Ltd—separating public customer support from read-only internal CRM
                analytics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenWebsiteChat}
                className="px-5 py-2.5 bg-[#1557B0] hover:bg-[#114690] text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <MessageSquare className="w-4 h-4" />
                Chat with Website AI
              </button>
              <button
                type="button"
                onClick={() => onNavigateWorkspace('crm')}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-[#0F172A] text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                Open CRM Copilot
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A]">
                  12–18%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  6-month kWh reduction
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#0F172A]">
                  100+
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Trained CRM Q&amp;As
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#3C9A35]">
                  2 Bots
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Zero cross-leakage
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_sustain_save_1795546568125.jpg"
                  alt="Sustain & Save corporate sustainability headquarters"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 to-slate-200">
                  <Building2 className="w-10 h-10 text-[#1557B0] mb-3" />
                  <p className="text-sm font-semibold text-[#0F172A]">
                    Sustain &amp; Save Enterprise Operations
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dual Bot Scope & Solutions */}
      <section className="bg-slate-50 border-y border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-[#0F172A]">
              01. Dual Chatbot Architecture
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Use the Website AI Chatbot to give visitors instant 24/7 answers about
              your company, products, services, and support, while your internal team
              uses the CRM Copilot to query leads, customers, follow-ups, tickets, and
              visual reports in seconds without modifying records.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#1557B0]">
                  Bot 1 · Public Frontend
                </p>
                <h3 className="text-lg font-semibold text-[#0F172A] mt-1">
                  Website AI Customer Assistant
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <li>· 24/7 answers from approved Sustain &amp; Save docs</li>
                  <li>· Pricing &amp; energy savings charts directly in chat</li>
                  <li>· Strict no-guessing guard with Call &amp; WhatsApp handoff</li>
                  <li>· Full conversation logging to Admin Chat History</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onOpenWebsiteChat}
                className="mt-6 w-full py-2 px-4 bg-[#1557B0] hover:bg-[#114690] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Test Website Bot Now
              </button>
            </div>

            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#3C9A35]">
                  Bot 2 · Internal Backend
                </p>
                <h3 className="text-lg font-semibold text-[#0F172A] mt-1">
                  CRM Read-Only Copilot
                </h3>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                  <li>· Role-Based Access Control (Super Admin, CRM Admin, Staff)</li>
                  <li>· Natural-language lead, customer, follow-up &amp; ticket reports</li>
                  <li>· Recharts Pie, Bar &amp; Line visuals from real DB counts</li>
                  <li>· Pre-trained with 100 CRM workflow &amp; SOP questions</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onNavigateWorkspace('crm')}
                className="mt-6 w-full py-2 px-4 bg-[#3C9A35] hover:bg-[#32822c] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Open CRM Copilot
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & NMD Pvt Ltd Offices Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <p className="text-xs font-medium text-[#1557B0]">
              02. Direct Engineering &amp; Sales Support
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-[#0F172A]">
              NMD Pvt Ltd — Official Implementation &amp; Support Partner
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Whenever the Website AI or CRM AI cannot find an approved answer, it
              never guesses—visitors and employees connect directly with our Pune
              support desk.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3C9A35] hover:bg-[#32822c] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
              <a
                href={telHref}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1557B0] hover:bg-[#114690] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call {support.supportPhone}
              </a>
              <a
                href={support.contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-medium rounded-lg transition-colors"
              >
                Contact Portal
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <MapPin className="w-4 h-4 text-[#3C9A35] shrink-0" />
                Head Office (Pune)
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {support.headOffice}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <MapPin className="w-4 h-4 text-[#1557B0] shrink-0" />
                Branch Office (Pune)
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {support.branchOffice}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Phone className="w-4 h-4 text-[#3C9A35] shrink-0" />
                Call Us
              </div>
              <a
                href={telHref}
                className="block text-base font-mono font-semibold text-[#1557B0] hover:underline"
              >
                {support.supportPhone}
              </a>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Mail className="w-4 h-4 text-[#1557B0] shrink-0" />
                Email Us
              </div>
              <a
                href={mailHref}
                className="block text-base font-medium text-[#1557B0] hover:underline break-all"
              >
                {support.supportEmail}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img
              src="/src/assets/images/sustain_save_logo_1795548412643.jpg"
              alt="Sustain & Save logo"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded object-contain shrink-0"
            />
            <span>
              Sustain &amp; Save Dual AI Chatbot Platform · Delivered by NMD Pvt Ltd
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onNavigateWorkspace('admin')}
              className="hover:text-[#0F172A] transition-colors"
            >
              Super Admin Console
            </button>
            <span>·</span>
            <a
              href={support.contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0F172A] transition-colors"
            >
              thedigitalnmd.com/contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
