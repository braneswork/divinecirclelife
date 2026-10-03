/* Íconos de línea, 24×24, trazo redondeado. */

const PATHS: Record<string, string> = {
  inicio: '<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="6.4" r="2.6"/><circle cx="12" cy="17.6" r="2.6"/><circle cx="7.15" cy="9.2" r="2.6"/><circle cx="16.85" cy="9.2" r="2.6"/><circle cx="7.15" cy="14.8" r="2.6"/><circle cx="16.85" cy="14.8" r="2.6"/>',
  pedidos: '<path d="M5 8.5h14l-1.1 10.6a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  clientes: '<circle cx="9" cy="8.5" r="3.1"/><path d="M3.6 19.4c.8-3 2.9-4.6 5.4-4.6s4.6 1.6 5.4 4.6"/><circle cx="16.8" cy="9.6" r="2.3"/><path d="M15.6 14.9c2.3 0 4 1.4 4.8 4"/>',
  caja: '<circle cx="12" cy="12" r="8.6"/><path d="M15.2 9a4 4 0 1 0 0 6"/><path d="M11.2 6.6v10.8"/>',
  experiencias: '<circle cx="12" cy="8" r="3.2"/><path d="M3 15.5c2 0 2.2-1.8 4.5-1.8s2.5 1.8 4.5 1.8 2.2-1.8 4.5-1.8 2.5 1.8 4.5 1.8"/><path d="M3 19.5c2 0 2.2-1.8 4.5-1.8s2.5 1.8 4.5 1.8 2.2-1.8 4.5-1.8 2.5 1.8 4.5 1.8"/>',
  circulo: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.4" stroke-dasharray="2.2 2.8"/>',
  catalogo: '<path d="M3.6 12.6V4.4h8.2l8.6 8.6-8.2 8.2z"/><circle cx="8.2" cy="9" r="1.5"/>',
  ajustes: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.8M12 18.4v2.8M2.8 12h2.8M18.4 12h2.8M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2"/>',
  factura: '<path d="M6 3.5h9l3 3v14H6z"/><path d="M9 9.5h6M9 13h6M9 16.5h3.5"/>',
  salida: '<circle cx="12" cy="12" r="8.6"/><path d="M8 12h8"/>',
  ventas: '<path d="M4 7.5h16l-1.4 11.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7z"/><path d="M8.5 11.5c.6 1.8 2 2.8 3.5 2.8s2.9-1 3.5-2.8"/><path d="M9 7.5V6a3 3 0 0 1 6 0v1.5"/>',
  productos: '<circle cx="12" cy="12" r="8.6"/><path d="M7.5 13.2c1-2.6 2.7-3.9 4.5-3.9s3.5 1.3 4.5 3.9"/><path d="M9.6 11.2l.9 1.4M12 10.3v1.7M14.4 11.2l-.9 1.4"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  ayuda: '<circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="16.9" r=".4" fill="currentColor"/>',
  lista: '<circle cx="5.5" cy="6.5" r="1.6"/><circle cx="5.5" cy="12" r="1.6"/><circle cx="5.5" cy="17.5" r="1.6"/><path d="M10 6.5h9.5M10 12h9.5M10 17.5h9.5"/>',
  repetir: '<path d="M17.5 4.5 20 7l-2.5 2.5"/><path d="M4 11.5V10a3 3 0 0 1 3-3h13"/><path d="M6.5 19.5 4 17l2.5-2.5"/><path d="M20 12.5V14a3 3 0 0 1-3 3H4"/>',
  proximos: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M10.5 13.5h3.5M12.5 12l1.5 1.5-1.5 1.5"/>',
  historial: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5v3.8h3.8"/><path d="M12 8v4.2l2.8 1.8"/>',
  ola: '<path d="M2.8 15.2c2.2 0 2.4-2 4.7-2s2.4 2 4.6 2 2.4-2 4.6-2 2.4 2 4.5 2"/><path d="M2.8 19.4c2.2 0 2.4-2 4.7-2s2.4 2 4.6 2 2.4-2 4.6-2 2.4 2 4.5 2"/><path d="M5.5 11c.4-3.8 3.1-6.4 6.6-6.4 2.4 0 4.2 1.3 4.8 3.2-1.9-.7-4 .3-4.3 2.4"/>',
  viento: '<path d="M3 8.5h10.5a2.6 2.6 0 1 0-2.6-2.6"/><path d="M3 12.5h15a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3 16.5h7.5"/>',
  marea: '<path d="M2.8 13.5c2.2 0 2.4-2 4.7-2s2.4 2 4.6 2 2.4-2 4.6-2 2.4 2 4.5 2"/><path d="M2.8 18c2.2 0 2.4-2 4.7-2s2.4 2 4.6 2 2.4-2 4.6-2 2.4 2 4.5 2"/><path d="M12 3v5.5M9.5 6 12 8.5 14.5 6"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
  luna: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  nube: '<path d="M7 18.5h10.2a3.8 3.8 0 0 0 .3-7.6 5.5 5.5 0 0 0-10.6 1.4A3.1 3.1 0 0 0 7 18.5z"/>',
  parcial: '<circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.2M2.8 8.5H4M4.5 4.5l.9.9M12.5 4.5l-.9.9"/><path d="M9 20h8.5a3.3 3.3 0 0 0 .2-6.6 4.8 4.8 0 0 0-9.2 1.2A2.7 2.7 0 0 0 9 20z"/>',
  lluvia: '<path d="M7 14.5h10.2a3.8 3.8 0 0 0 .3-7.6 5.5 5.5 0 0 0-10.6 1.4A3.1 3.1 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
  tormenta: '<path d="M7 14.5h10.2a3.8 3.8 0 0 0 .3-7.6 5.5 5.5 0 0 0-10.6 1.4A3.1 3.1 0 0 0 7 14.5z"/><path d="M12.5 15.5l-2 3.2h3l-2 3.3"/>',
  atardecer: '<path d="M7.5 15.5a4.5 4.5 0 0 1 9 0"/><path d="M2.8 19h18.4M12 4.5v3.5M9.8 6l2.2 2.2L14.2 6M4.6 11.2l1.4 1M19.4 11.2l-1.4 1"/>',
  basura: '<path d="M4.5 7h15M9.5 7V5.2c0-.7.5-1.2 1.2-1.2h2.6c.7 0 1.2.5 1.2 1.2V7"/><path d="M6.5 7l.8 11.6a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7"/><path d="M10 11v5.5M14 11v5.5"/>',
  saltar: '<circle cx="12" cy="12" r="8.6"/><path d="M6 18 18 6"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  volver: '<path d="M14.5 6 8.5 12l6 6"/>',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={'icon ' + className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? '' }}
    />
  );
}
