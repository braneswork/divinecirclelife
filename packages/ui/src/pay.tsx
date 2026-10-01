/* Marca de pago de Divine (del sistema original):
   ✓ pagado (verde) · ✕ no pagó (rojo) · + crédito a favor (magenta / dorado en oscuro).
   Tocarla avanza en ese mismo orden. */

import { PAY, type PayState } from '@dc/core';

export function PayMark({ state, onChange, size = 30 }: { state: PayState; onChange?: (next: PayState) => void; size?: number }) {
  const { mark, label, next } = PAY[state];
  const style = { '--s': `${size}px` } as React.CSSProperties;
  return onChange ? (
    <button type="button" className={'pay ' + state} style={style} onClick={e => { e.stopPropagation(); onChange(next); }} title={`${label} — tocá para cambiar`} aria-label={label}>
      {mark}
    </button>
  ) : (
    <span className={'pay ' + state} style={style} title={label} aria-label={label}>{mark}</span>
  );
}
