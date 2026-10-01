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
  /** familia dentro de los productos: pan, bebidas, café… */
  category?: string;
  /** foto (URL o data URL reducida); sin foto se muestra un círculo con sus iniciales */
  image?: string;
  /** lo que la gente necesita saber: ingredientes, duración, qué incluye */
  description?: string;
  /** presentación: "unidad", "800 g", "2 horas"… */
  unit?: string;
}

export const CATEGORIES = ['pan', 'bebidas', 'café', 'cocina', 'otros'];

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
  /** descuento negociado con el cliente (0.32 = 32 %), fijado al momento del pedido */
  discount?: number;
}

export interface Order {
  id: string;
  client: string;
  /** cliente registrado (con descuentos y forma de cobro) */
  clientId?: string;
  /** factura mensual que lo incluye */
  invoiceId?: string;
  /** pedido fijo que lo generó */
  recurringId?: string;
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

/** contado: paga en cada pedido · mensual: se acumula y se factura a fin de mes */
export type Billing = 'contado' | 'mensual';

export interface Client {
  id: string;
  name: string;
  /** otros nombres con los que se escribe en pedidos ("manta", "pilo") */
  aliases?: string[];
  contact?: string;
  phone?: string;
  address?: string;
  billing: Billing;
  /** descuento negociado por oferta: offeringId → 0.32 */
  discounts: Record<string, number>;
  note?: string;
  active: boolean;
}

export interface InvoiceLine {
  code: string;
  name: string;
  qty: number;
  subtotal: number;
  discount: number;
  total: number;
}

export interface InvoiceAdjustment {
  label: string;
  /** negativo resta (préstamo, abono), positivo suma */
  amount: number;
}

export interface Invoice {
  id: string;
  /** recibo correlativo: 0006 */
  number: string;
  clientId: string;
  client: string;
  /** mes facturado, YYYY-MM */
  period: string;
  date: string;
  lines: InvoiceLine[];
  adjustments: InvoiceAdjustment[];
  orderIds: string[];
  status: 'abierta' | 'pagada';
  createdAt: string;
}

/** Tipos de salida, de la hoja "Fixed Cost". */
export const EXPENSE_TYPES = [
  'ingredientes', 'super', 'renta', 'baker / cook', 'delivery', 'librería', 'gas',
  'ferretería', 'técnico', 'mecánico', 'mantenimiento', 'owner', 'partners', 'comisiones', 'adelanto / bono', 'otros',
];

export interface Expense {
  id: string;
  date: string;
  type: string;
  amount: number;
  note?: string;
  method?: string;
  createdAt: string;
}

/** Pedido fijo: se repite ciertos días de la semana (cada 1 o 2 semanas). */
export interface Recurring {
  id: string;
  client: string;
  clientId?: string;
  items: { offeringId: string; qty: number }[];
  /** días de la semana: 0 domingo … 6 sábado */
  weekdays: number[];
  /** cada cuántas semanas (1 = semanal, 2 = quincenal) */
  every: 1 | 2;
  /** desde qué día rige (YYYY-MM-DD); también ancla la quincena */
  start: string;
  until?: string;
  pay: PayState;
  note?: string;
  active: boolean;
  /** días que no se deben volver a generar (porque se borró esa venta) */
  skips: string[];
  createdAt: string;
}
