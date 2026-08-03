'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { persistDashboardInitialView } from '@/lib/dashboard/views';
import { persistPortalInitialSection } from '@/lib/portal/sections';
import { usersViewPath, type UsersViewId } from '@/lib/users/views';
import type { AssistantAction, AssistantReply } from '@/lib/assistant/types';
import { resolveAssistantActionHref } from '@/lib/assistant/action-url';
import { ASSISTANT_SUGGESTIONS } from '@/lib/assistant/knowledge';
import { shouldAutoApplyNavigation } from '@/lib/assistant/navigation';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: AssistantAction[];
  suggestions?: string[];
  openInNewTab?: boolean;
};

function renderMarkdownLite(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function GarmonikChatWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Assalomaleykum. Sizga qanday yordam bera olaman!',
      suggestions: ASSISTANT_SUGGESTIONS,
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const applyAction = useCallback(
    (action: AssistantAction, openInNewTab?: boolean) => {
      if (openInNewTab) {
        const href = resolveAssistantActionHref(action);
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }

      setOpen(false);
      switch (action.type) {
        case 'navigate':
          router.push(action.href);
          break;
        case 'dashboard_view':
          persistDashboardInitialView(action.view);
          router.push('/dashboard');
          break;
        case 'portal_section':
          persistPortalInitialSection(action.section);
          router.push(
            action.section === 'users' ? '/users'
            : action.section === 'patients' ? '/patients'
            : action.section === 'appointments' ? '/appointments'
            : action.section === 'services' ? '/services'
            : action.section === 'settings' ? '/settings'
            : '/reports',
          );
          break;
        case 'users_view':
          persistPortalInitialSection('users');
          router.push(usersViewPath(action.view as UsersViewId));
          break;
      }
    },
    [router],
  );

  const sendMessage = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || loading) return;

      const userMsg: ChatMsg = {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
      };
      setMessages((m) => [...m, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch('/api/assistant/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        });
        const data = (await res.json()) as AssistantReply & { error?: string };
        if (!res.ok) throw new Error(data.error || 'Xatolik');

        setMessages((m) => [
          ...m,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.message,
            actions: data.actions,
            suggestions: data.suggestions,
            openInNewTab: data.openInNewTab,
          },
        ]);

        const action = data.actions?.[0];
        if (
          action &&
          data.actions?.length === 1 &&
          shouldAutoApplyNavigation(text, data.message)
        ) {
          applyAction(action, data.openInNewTab);
        }
      } catch (e) {
        setMessages((m) => [
          ...m,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            text:
              e instanceof Error ? e.message : 'Javob olib bo\'lmadi. Qayta urinib ko\'ring.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, applyAction],
  );

  return (
    <div
      className="fixed right-4 bottom-16 z-[200] flex flex-col items-end gap-2 sm:right-8 sm:bottom-20 md:right-10 md:bottom-24"
      data-chat-path={pathname}>
      {open && (
        <div
          className="flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-2xl shadow-violet-500/15"
          style={{ maxHeight: 'min(70vh, 520px)' }}>
          <div className="flex items-center gap-2 border-b border-violet-100 bg-linear-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-white">
            <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-white/20 ring-2 ring-white/40">
              <Image
                src="/garmonik-logo-user.png"
                alt="Garmonik"
                fill
                className="object-cover"
                sizes="32px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Garmonik yordamchi</p>
              <p className="text-[10px] text-white/80">Online — savol bering</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-white/90 hover:bg-white/15"
              aria-label="Yopish">
              <X className="size-4" />
            </button>
          </div>

          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user' ?
                    'ml-auto bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-800',
                )}>
                <p>{renderMarkdownLite(msg.text)}</p>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {msg.actions.map((action, i) => (
                      <Button
                        key={i}
                        type="button"
                        size="xs"
                        variant={msg.role === 'user' ? 'secondary' : 'outline'}
                        className="h-auto min-h-7 justify-start whitespace-normal py-1 text-left text-xs"
                        onClick={() => applyAction(action, msg.openInNewTab)}>
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[10px] text-violet-700 hover:bg-violet-50"
                        onClick={() => void sendMessage(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="size-3.5 animate-spin" />
                Javob yozilmoqda...
              </div>
            )}
          </div>

          <form
            className="flex gap-1.5 border-t border-slate-100 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Savol yozing..."
              className="h-9 flex-1 rounded-xl text-sm"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon-sm"
              className="shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700"
              disabled={loading || !input.trim()}>
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'group relative flex size-14 items-center justify-center rounded-full bg-linear-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 transition hover:scale-105 hover:shadow-xl',
          !open && 'chat-fab-idle',
          open && 'ring-2 ring-violet-300 ring-offset-2',
        )}
        aria-label={open ? 'Chatni yopish' : 'Garmonik yordamchi'}>
        <span
          className={cn(
            'absolute -top-1 -right-1 size-3 rounded-full bg-emerald-400 ring-2 ring-white',
            !open && 'animate-pulse',
          )}
        />
        <div
          className={cn(
            'relative size-10 overflow-hidden rounded-full bg-white/95 ring-2 ring-white/50',
            !open && 'chat-fab-idle-inner',
          )}>
          <Image
            src="/garmonik-logo-user.png"
            alt=""
            fill
            className="object-cover p-0.5"
            sizes="40px"
          />
        </div>
        {!open && (
          <span className="pointer-events-none absolute -bottom-1 -left-1 size-0 border-t-[10px] border-r-[10px] border-t-violet-600 border-r-transparent" />
        )}
      </button>
    </div>
  );
}
