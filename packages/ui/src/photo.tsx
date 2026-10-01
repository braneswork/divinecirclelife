/* Foto circular. Sin foto: un círculo con el color del pilar, las iniciales
   y un ícono de cámara, para que siempre se vea dónde va la imagen. */

import type { CSSProperties } from 'react';

const initials = (name: string) =>
  name.split(/\s+/).filter(w => /[A-Za-zÁÉÍÓÚÑ0-9]/.test(w[0] ?? '')).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function Photo({ src, name, tone, size, className = '' }: { src?: string; name: string; tone?: string; size?: number | string; className?: string }) {
  const style = { '--pt': tone ?? 'var(--gold)', ...(size ? { width: size, height: size } : {}) } as CSSProperties;
  return (
    <span className={'photo ' + (src ? 'has-img ' : 'placeholder ') + className} style={style} role="img" aria-label={src ? name : `${name} (sin foto)`}>
      {src ? <img src={src} alt="" loading="lazy" /> : (
        <>
          <b>{initials(name)}</b>
          <svg viewBox="0 0 24 24" width="18%" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8.5h3l1.6-2.2h6.8L17 8.5h3v10H4z" /><circle cx="12" cy="13.3" r="3.2" />
          </svg>
        </>
      )}
    </span>
  );
}

/** Reduce una imagen elegida a ≤ max px y la devuelve como data URL JPEG (para guardarla ligera). */
export function shrinkImage(file: File, max = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}
