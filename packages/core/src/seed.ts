import type { Client, Offering, Project } from './types';

export const DIVINE_ID = 'divine-circle';

export const SEED_PROJECTS: Project[] = [
  { id: DIVINE_ID, slug: 'divine-circle', name: 'Divine Circle', ring: 'nucleo', branes: true, tagline: 'Pan de masa madre y experiencias humanas', active: true },
  { id: 'take-off', slug: 'take-off', name: 'Take Off Surf School', ring: 'aliado', branes: true, tagline: 'Clases de surf', active: true },
  { id: 'branes', slug: 'branes', name: 'Branes', ring: 'aliado', branes: true, tagline: 'Coworking y comunidad', active: true },
];

const pan = (code: string, name: string, price: number): Offering => ({
  id: 'pan-' + code.toLowerCase(), projectId: DIVINE_ID, kind: 'producto', code, name, price, active: true, public: true, pillar: 'food', category: 'pan',
});

// Catálogo de panes del hub anterior
export const SEED_OFFERINGS: Offering[] = [
  pan('C', 'Campesino', 4000),
  pan('MS', 'Multiseeds', 5000),
  pan('CU', 'Cuadrado', 4000),
  pan('BAG', 'Baguette', 1000),
  pan('CR', 'Cinnamon Roll', 1500),
  pan('BB', 'Burger Bun', 700),
  pan('CIA', 'Ciabatta', 1000),
  pan('PZ', 'Pizza', 4000),
  pan('PZF', 'Pizza Frozen', 3000),
];

const exp = (code: string, name: string, price: number, pillar: Offering['pillar'], projectId = DIVINE_ID): Offering => ({
  id: 'exp-' + code.toLowerCase(), projectId, kind: 'experiencia', code, name, price, active: true, public: false, pillar,
});

/** Experiencias de la hoja "Services & Products". */
export const SEED_EXPERIENCES: Offering[] = [
  exp('SR', 'Surf Ride', 40000, 'movement', 'take-off'),
  exp('SP', 'Surf Pack', 40000, 'movement', 'take-off'),
  exp('BX', 'Baking Experience', 30000, 'food'),
  exp('KAD', 'Kids Art Day', 25000, 'imagination'),
  exp('AAN', 'Adults Art Night', 25000, 'imagination'),
  exp('DJ', 'DJ & Electronic Music', 25000, 'imagination'),
  exp('DAB', 'Digital Art Basics', 25000, 'wisdom'),
  exp('MP', 'Music Production', 25000, 'wisdom'),
];

/** Clientes de la hoja "Sources". Mantarraya: descuentos de las facturas 2026. */
export const SEED_CLIENTS: Client[] = [
  {
    id: 'mantarraya', name: 'Mantarraya Café', aliases: ['mantarraya', 'manta'], contact: 'Pilo Mora',
    address: 'Playa Hermosa', billing: 'mensual', discounts: { 'pan-bb': 0.32, 'pan-c': 0.3 }, active: true,
  },
  { id: 'chez-coco', name: 'Chez Coco', contact: 'Nico', billing: 'contado', discounts: {}, active: true },
  { id: 'batik', name: 'Batik', contact: 'Sammy', billing: 'contado', discounts: {}, active: true },
  { id: 'take-off', name: 'Take Off', contact: 'Jesus Zabala', billing: 'contado', discounts: {}, active: true },
  { id: 'traveland', name: 'Traveland', contact: 'Erick Vega', billing: 'contado', discounts: {}, active: true },
  { id: 'villas-argan', name: 'Villas Argan', contact: 'Azzurra Daga', billing: 'contado', discounts: {}, active: true },
];

/** El último recibo emitido en la hoja fue 0005. */
export const INVOICE_SEQ_START = 5;
