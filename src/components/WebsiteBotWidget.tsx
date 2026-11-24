import {
  Bot,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  RotateCcw,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { auth, persistChatTurnToFirestore } from '../lib/firebase';
import type { ChatMessageItem, SupportConfig } from '../types/platform';
import { ChartCard } from './ChartCard';

interface WebsiteBotWidgetProps {
  botName: string;
  welcomeMessage: string;
  suggestedQuestions: string[];
  enabled: boolean;
  support: SupportConfig;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function WebsiteBotWidget({
  botName,
  welcomeMessage,
  suggestedQuestions,
  enabled,
  support,
  externalOpen,
  onExternalOpenChange,
}: WebsiteBotWidgetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onExternalOpenChange?.(v);
  };

  const [conversationId, setConversationId] = useState(
    () => `web-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  );
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 'welcome-web',
      conversationId,
      botType: 'website',
      sender: 'assistant',
      text: welcomeMessage,
      timestamp: new Date().toISOString(),
      feedback: 'none',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === 'welcome-web'
        ? [{ ...prev[0], text: welcomeMessage }]
        : prev
    );
  }, [welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const resetChat = () => {
    const newId = `web-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    setConversationId(newId);
    setMessages([
      {
        id: 'welcome-web',
        conversationId: newId,
        botType: 'website',
        sender: 'assistant',
        text: welcomeMessage,
        timestamp: new Date().toISOString(),
        feedback: 'none',
      },
    ]);
    setErrorMsg(null);
  };

  const sendMessage = async (textToSend?: string) => {
    const content = (textToSend ?? input).trim();
    if (!content || loading) return;

    setInput('');
    setErrorMsg(null);
    const optimisticUser: ChatMessageItem = {
      id: `local-u-${Date.now()}`,
      conversationId,
      botType: 'website',
      sender: 'user',
      text: content,
      timestamp: new Date().toISOString(),
      feedback: 'none',
    };

    const nextHistory = [...messages, optimisticUser];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const res = await fetch('/api/chat/website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          message: content,
          conversationId,
          history: messages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reach Website AI Chatbot.');
      }

      const serverUserMsg = data.userMessage as ChatMessageItem;
      const serverBotMsg = data.assistantMessage as ChatMessageItem;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== optimisticUser.id),
        serverUserMsg,
        serverBotMsg,
      ]);

      persistChatTurnToFirestore({
        botType: 'website',
        conversationId,
        userMessage: serverUserMsg,
        assistantMessage: serverBotMsg,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Network error sending message.'
      );
    } finally {
      setLoading(false);
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

  const logSupportClick = (channel: 'call' | 'whatsapp' | 'email', question: string) => {
    fetch('/api/public/escalation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        question,
        channel,
        botType: 'website',
      }),
    }).catch(() => {});
  };

  const telHref = `tel:${support.supportPhone.replace(/\s+/g, '')}`;
  const waHref = `https://wa.me/${support.whatsappNumber.replace(/[^0-9]/g, '')}`;
  const mailHref = `mailto:${support.supportEmail}?subject=${encodeURIComponent(
    'Sustain & Save Support Inquiry'
  )}`;

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Website AI Chatbot"
          className="group flex items-center gap-2.5 bg-[#1557B0] hover:bg-[#114690] text-white px-4 py-3 rounded-full shadow-lg transition-transform duration-150 hover:-translate-y-0.5 cursor-pointer"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-semibold whitespace-nowrap">
            Ask Sustain &amp; Save AI
          </span>
        </button>
      )}

      {open && (
        <div className="w-[calc(100vw-2rem)] sm:w-[410px] h-[min(620px,calc(100vh-3rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-[#0F172A] text-white px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#3C9A35] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">{botName}</h3>
                <p className="text-[11px] text-slate-300 truncate">
                  24/7 Website Support · Approved Docs Only
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={resetChat}
                title="New conversation"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chatbot"
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Direct Support Quick Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 font-medium truncate">
              Need human support?
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={telHref}
                onClick={() => logSupportClick('call', 'Direct header Call Support click')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[#1557B0] hover:bg-slate-100 font-medium whitespace-nowrap"
              >
                <Phone className="w-3 h-3" />
                Call
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => logSupportClick('whatsapp', 'Direct header WhatsApp click')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#3C9A35] text-white hover:bg-[#32822c] font-medium whitespace-nowrap"
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </a>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-[#1557B0] text-white'
                      : 'bg-slate-50 border border-slate-200 text-[#0F172A]'
                  }`}
                >
                  {msg.text}
                </div>

                {msg.chart && (
                  <div className="w-full mt-2">
                    <ChartCard chart={msg.chart} compact />
                  </div>
                )}

                {msg.escalated && (
                  <div className="mt-2 w-full bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-900">
                      Connect with NMD Pvt Ltd Support Team
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={telHref}
                        onClick={() => logSupportClick('call', msg.text)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1557B0] text-white text-xs font-medium hover:bg-[#114690]"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call {support.supportPhone}
                      </a>
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logSupportClick('whatsapp', msg.text)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3C9A35] text-white text-xs font-medium hover:bg-[#32822c]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp Support
                      </a>
                      <a
                        href={mailHref}
                        onClick={() => logSupportClick('email', msg.text)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-medium hover:bg-slate-50"
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
                      <span className="truncate max-w-[180px]" title={msg.sourceRefs.join(', ')}>
                        Source: {msg.sourceRefs[0]}
                      </span>
                    </>
                  )}
                  {msg.sender === 'assistant' && msg.id !== 'welcome-web' && (
                    <div className="flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'up')}
                        aria-label="Helpful"
                        className={`p-0.5 rounded hover:text-[#3C9A35] ${
                          msg.feedback === 'up' ? 'text-[#3C9A35]' : 'text-slate-400'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, 'down')}
                        aria-label="Not helpful"
                        className={`p-0.5 rounded hover:text-red-600 ${
                          msg.feedback === 'down' ? 'text-red-600' : 'text-slate-400'
                        }`}
                      >
                        <ThumbsDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length <= 1 && suggestedQuestions.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[11px] font-medium text-slate-500">
                  Suggested questions
                </p>
                <div className="flex flex-col gap-1.5">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-[#1557B0] hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:240ms]" />
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="border-t border-slate-200 p-3 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!enabled || loading}
              placeholder={
                enabled
                  ? 'Ask about Sustain & Save products, plans, or support...'
                  : 'Website Bot is currently paused'
              }
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#1557B0] disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!enabled || loading || !input.trim()}
              aria-label="Send message"
              className="p-2.5 bg-[#1557B0] hover:bg-[#114690] disabled:opacity-50 text-white rounded-lg transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
