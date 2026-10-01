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

import type { PillarId } from './pillars';

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
  /** pilar al que pertenece (pan → food, surf → movement…) */
  pillar?: PillarId;
}

/** Flujo del horno, como en el sistema original de Divine. */
export type OrderStatus = 'pendiente' | 'horneando' | 'listo' | 'entregado' | 'cancelado';

/** Marca de pago de Divine: ✓ pagado · ✕ no pagó · + crédito a favor. */
export type PayState = 'paid' | 'pending' | 'credit';
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
  pay: PayState;
  note?: string;
  phone?: string;
  source: OrderSource;
  createdAt: string;
  updatedAt: string;
}
