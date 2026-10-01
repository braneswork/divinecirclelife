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
