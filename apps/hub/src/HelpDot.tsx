import { useNav } from './nav';

/** "?" pequeño junto a algo que necesita explicación: abre la ayuda en esa sección. */
export function HelpDot({ topic, label = 'Ayuda' }: { topic: string; label?: string }) {
  const nav = useNav();
  return <button type="button" className="help-dot" onClick={() => nav.help(topic)} aria-label={label} title={label}>?</button>;
}
