import { Fragment, useMemo } from 'react'

import { parseMarkdown, type Inline } from '@/lib/markdown'

function Inlines({ nodes }: { nodes: Inline[] }) {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text': return <Fragment key={i}>{n.v}</Fragment>
      case 'code': return <code key={i} className="rounded bg-surface-2 px-1 py-px font-mono text-[12px]">{n.v}</code>
      case 'strong': return <strong key={i} className="font-semibold"><Inlines nodes={n.c} /></strong>
      case 'em': return <em key={i}><Inlines nodes={n.c} /></em>
      case 'del': return <del key={i} className="text-muted"><Inlines nodes={n.c} /></del>
      case 'link': return (
        <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow"
          className="break-words text-accent-text underline underline-offset-2 hover:no-underline"><Inlines nodes={n.c} /></a>
      )
    }
  })
}

const Lines = ({ lines }: { lines: Inline[][] }) => lines.map((l, i) => <Fragment key={i}>{i > 0 && <br />}<Inlines nodes={l} /></Fragment>)

/** Texto con formato (ver lib/markdown.ts). Sin HTML crudo: todo se dibuja con elementos de React. */
export function RichText({ source, className = '' }: { source: string; className?: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source])
  return (
    <div className={`space-y-2 break-words text-[13px] leading-relaxed text-text ${className}`}>
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'p': return <p key={i}><Lines lines={b.lines} /></p>
          case 'h': return (
            <p key={i} role="heading" aria-level={b.level + 3}
              className={`pt-1 font-semibold ${b.level === 1 ? 'text-[15px]' : b.level === 2 ? 'text-[14px]' : 'text-[13px]'}`}>
              <Inlines nodes={b.c} />
            </p>
          )
          case 'ul': return <ul key={i} className="list-disc space-y-0.5 pl-5 marker:text-subtle">{b.items.map((it, j) => <li key={j}><Inlines nodes={it} /></li>)}</ul>
          case 'ol': return <ol key={i} start={b.start} className="list-decimal space-y-0.5 pl-5 marker:font-mono marker:text-[12px] marker:text-subtle">{b.items.map((it, j) => <li key={j}><Inlines nodes={it} /></li>)}</ol>
          case 'quote': return <blockquote key={i} className="border-l-2 border-border-strong pl-3 text-muted"><Lines lines={b.lines} /></blockquote>
        }
      })}
    </div>
  )
}
