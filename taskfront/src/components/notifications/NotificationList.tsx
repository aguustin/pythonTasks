'use client'

import { AtSign, CalendarClock, CircleCheck, MessageSquare, UserRoundPlus, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { markAllNotificationsRead, markNotificationRead } from '@/app/(workspace)/notificaciones/actions'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { dayHeading, groupByDay, timeOf } from '@/lib/activity'
import { notificationLink, notificationText, type AppNotification, type NotificationVerb } from '@/lib/notifications'
import { colorVars } from '@/lib/palette'

const ICONS: Record<NotificationVerb, LucideIcon> = {
  assigned: UserRoundPlus,
  commented: MessageSquare,
  mentioned: AtSign,
  completed: CircleCheck,
  due_tomorrow: CalendarClock,
}

/**
 * Bandeja de avisos. Abrir uno lo marca como leído y lleva a la tarea.
 * "Marcar todas como leídas" no tiene Deshacer: no hay forma de volver a dejarlas sin leer.
 */
export function NotificationList({ items, today, unread }: { items: AppNotification[]; today: string; unread: number }) {
  const router = useRouter()
  const toast = useToast()
  const [readLocal, setReadLocal] = useState<Set<number>>(new Set())
  const [pending, startTransition] = useTransition()

  const open = (n: AppNotification) => {
    setReadLocal((s) => new Set(s).add(n.id))
    if (!n.read_at) void markNotificationRead(n.id)
    router.push(notificationLink(n))
  }

  const readAll = () => startTransition(async () => {
    const res = await markAllNotificationsRead().catch(() => ({ ok: false as const, error: 'No se pudo conectar.' }))
    if (!res.ok) return toast({ tone: 'error', message: res.error })
    setReadLocal(new Set(items.map((n) => n.id)))
    toast({ tone: 'success', message: 'Todos los avisos quedaron como leídos.' })
    router.refresh()
  })

  return (
    <>
      {unread > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onClick={readAll} disabled={pending}>{pending ? 'Marcando…' : 'Marcar todas como leídas'}</Button>
        </div>
      )}
      <div className="space-y-5">
        {groupByDay(items).map((g) => (
          <section key={g.day} aria-labelledby={`dia-${g.day}`}>
            <h2 id={`dia-${g.day}`} className="eyebrow mb-2">{dayHeading(g.day, today)}</h2>
            <ul className="divide-y divide-border rounded-[var(--radius-md)] border border-border bg-surface">
              {g.items.map((n) => {
                const isUnread = !n.read_at && !readLocal.has(n.id)
                const Icon = ICONS[n.verb]
                return (
                  <li key={n.id} data-notification={n.id}>
                    <Link href={notificationLink(n)} onClick={(e) => { e.preventDefault(); open(n) }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-2 ${isUnread ? 'bg-accent-subtle/40' : ''}`}>
                      <Icon aria-hidden size={17} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${isUnread ? 'text-accent-text' : 'text-subtle'}`} />
                      <div className="min-w-0 flex-1 text-[13px] leading-snug">
                        <p className={isUnread ? 'text-text' : 'text-muted'}>
                          {n.actor && n.verb !== 'due_tomorrow' && <span className="font-semibold">{n.actor.full_name} </span>}
                          {notificationText(n)}
                          {isUnread && <span className="sr-only"> (sin leer)</span>}
                        </p>
                        {n.data.excerpt && <p className="mt-0.5 line-clamp-2 text-subtle">“{n.data.excerpt}”</p>}
                        <p className="mt-1 inline-flex items-center gap-1.5 text-[12px] text-subtle">
                          <span aria-hidden style={colorVars(n.board_color)} className="size-2 rounded-[2px] bg-[var(--pc)] dark:bg-[var(--pc-dark)]" />
                          {n.board_title}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-subtle">{timeOf(n.created_at)}</span>
                      {isUnread && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
