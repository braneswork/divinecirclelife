/* Modelo del Círculo.
   Todo gira alrededor de un núcleo (Divine Circle) y anillos de proyectos:
   - nucleo:     lo que Divine Circle produce (pan, café, experiencias propias)
   - aliado:     socios que operan dentro del círculo (Take Off, Branes)
   - vecino:     emprendimientos aledaños que Divine Circle promueve
   Cada proyecto ofrece cosas (offerings) que se pueden pedir o reservar. */

export type Ring = 'nucleo' | 'aliado' | 'vecino';

export interface Project {
  id: string;
  slug: string;
  name: string;
  ring: Ring;
  /** forma parte del ecosistema Branes */
  branes: boolean;
  tagline?: string;
  active: boolean;
}

export type OfferingKind = 'producto' | 'experiencia' | 'servicio';

export interface Offering {
  id: string;
  projectId: string;
  kind: OfferingKind;
  /** código corto para escribir rápido: C, MS, CR… (único, en mayúsculas) */
  code: string;
  name: string;
  /** precio en colones */
  price: number;
  active: boolean;
  /** visible en la web */
  public: boolean;
}

export type OrderStatus = 'pendiente' | 'listo' | 'entregado' | 'cancelado';
export type OrderSource = 'hub' | 'web';

export interface OrderItem {
  offeringId: string;
  code: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  client: string;
  /** día de entrega, YYYY-MM-DD */
  date: string;
  items: OrderItem[];
  /** monto acordado que reemplaza la suma de las líneas */
  amountOverride?: number;
  status: OrderStatus;
  paid: boolean;
  note?: string;
  phone?: string;
  source: OrderSource;
  createdAt: string;
  updatedAt: string;
}
