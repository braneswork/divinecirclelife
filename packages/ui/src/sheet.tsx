/* Hoja: un documento sobre todo lo demás (fichas, ayuda, facturas). */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Sheet({ children, onClose, className = '', label }: { children: ReactNode; onClose: () => void; className?: string; label?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return createPortal(
    <div className="sheet-overlay" role="dialog" aria-modal="true" aria-label={label} onClick={e => e.target === e.currentTarget && onClose()}>
      <article className={'sheet ' + className}>
        <button className="sheet-close" onClick={onClose} aria-label="Cerrar">×</button>
        {children}
      </article>
    </div>,
    document.body,
  );
}

/** Markdown mínimo para la ayuda: ## y ### títulos ({#id} opcional), listas "- ", **negrita**, `código`. */
export function Markdown({ text, focus }: { text: string; focus?: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
      part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part);
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) { blocks.push(<ul key={blocks.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>); list = []; } };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const h = line.match(/^(#{1,4})\s+(.*?)(?:\s+\{#([\w-]+)\})?$/);
    if (h) {
      flush();
      const level = h[1].length, id = h[3];
      const Tag = (`h${Math.min(level + 1, 5)}`) as 'h2' | 'h3' | 'h4' | 'h5';
      blocks.push(<Tag key={blocks.length} id={id ? 'ayuda-' + id : undefined} className={id && id === focus ? 'here' : undefined}>{inline(h[2])}</Tag>);
    } else if (/^\s*-\s+/.test(line)) list.push(line.replace(/^\s*-\s+/, ''));
    else if (line.trim() === '') flush();
    else if (/^\|/.test(line)) { flush(); blocks.push(<p key={blocks.length} className="md-row">{inline(line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()).join('  ·  '))}</p>); }
    else { flush(); blocks.push(<p key={blocks.length}>{inline(line)}</p>); }
  }
  flush();
  return <div className="md">{blocks}</div>;
}
