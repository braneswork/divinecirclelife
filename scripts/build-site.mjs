/* Arma el sitio que publica Vercel en dist/:
   /        hub (la dirección de siempre)
   /web/    web pública
   /kit/    UI kit
   /legacy/ hub anterior, como referencia */

import { cpSync, rmSync, mkdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('apps/hub/dist', 'dist', { recursive: true });
cpSync('apps/web/dist', 'dist/web', { recursive: true });
cpSync('apps/kit/dist', 'dist/kit', { recursive: true });
cpSync('legacy/hub-v1', 'dist/legacy', { recursive: true });
console.log('dist/ listo: hub en /, web en /web/, kit en /kit/, anterior en /legacy/');
