/* + Entrada: anotar una venta escribiéndola rápido ("2C 1MS Soleida") o
   eligiendo de la tienda (todo el catálogo con fotos). La tienda es la misma
   pieza que usará la web. Las dos terminan en la ficha de la venta. */

import { useMemo, useRef, useState } from 'react';
import { PAY, QUICK_ERRORS, dayLabel, matchClient, parseQuick } from '@dc/core';
import { Shop, useToast, type Cart } from '@dc/ui';
import { today, useStore } from '../store';
import { useNav } from '../nav';
import { HelpDot } from '../HelpDot';
import { OrderSheet, draftFromLines, type OrderDraft } from './OrderSheet';

export function Entrada() {
  const offerings = useStore(s => s.offerings);
  const clients = useStore(s => s.clients);
  const toast = useToast();
  const nav = useNav();
  const now = today();
  const [text, setText] = useState('');
  const [cart, setCart] = useState<Cart>({});
  const [draft, setDraft] = useState<(OrderDraft & { shop?: boolean }) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = useMemo(() => parseQuick(text, offerings, now), [text, offerings, now]);
  const active = offerings.filter(o => o.active);

  const done = (client: string, date: string) =>
    toast(`Anotado: ${client} · ${dayLabel(date, now)}`, { label: 'Ver ventas', run: () => nav.enter('ventas') });

  function quick(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.ok) return toast(QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : ''));
    // lo escrito abre la misma ficha que la tienda, para revisar, marcar semanal o pago
    setDraft(draftFromLines(parsed.lines, { client: parsed.client, date: parsed.date, pay: parsed.pay, note: parsed.note, weekly: parsed.weekly, amountOverride: parsed.amountOverride }));
  }

  return (
    <>
      <Shop
        offerings={active}
        cart={cart}
        onCart={setCart}
        onCheckout={() => setDraft({ cart, shop: true })}
        filters={false}
        top={
          <div className="quick-top">
            <form className="portal" onSubmit={quick}>
              <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} autoComplete="off" autoCapitalize="off" spellCheck={false}
                placeholder="Rápido: 2C 1MS Soleida" aria-label="Venta rápida" />
              <HelpDot topic="ventas" label="Cómo escribir una venta rápida" />
              <button className="go" disabled={!parsed.ok} aria-label="Anotar">↵</button>
            </form>
            {text.trim() && (
              <p className={'hint' + (parsed.ok ? '' : ' bad')} aria-live="polite">
                {parsed.ok
                  ? <><b>{matchClient(parsed.client, clients)?.name ?? parsed.client}</b> · {parsed.lines.map(l => `${l.qty} ${l.offering.name}`).join(', ')} · {dayLabel(parsed.date, now)} · {PAY[parsed.pay].mark}{parsed.weekly ? ' · ↻ semanal' : ''}</>
                  : QUICK_ERRORS[parsed.error] + (parsed.detail ? `: ${parsed.detail}` : '')}
              </p>
            )}
          </div>
        }
      />
      {draft && (
        <OrderSheet
          initial={draft}
          onCart={draft.shop ? setCart : undefined}
          onClose={() => setDraft(null)}
          onDone={(client, date) => { if (draft.shop) setCart({}); else setText(''); setDraft(null); done(client, date); }}
        />
      )}
    </>
  );
}
