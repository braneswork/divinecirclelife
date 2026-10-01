import type { Offering, Project } from './types';

export const DIVINE_ID = 'divine-circle';

export const SEED_PROJECTS: Project[] = [
  { id: DIVINE_ID, slug: 'divine-circle', name: 'Divine Circle', ring: 'nucleo', branes: true, tagline: 'Pan de masa madre y experiencias humanas', active: true },
  { id: 'take-off', slug: 'take-off', name: 'Take Off Surf School', ring: 'aliado', branes: true, tagline: 'Clases de surf', active: true },
  { id: 'branes', slug: 'branes', name: 'Branes', ring: 'aliado', branes: true, tagline: 'Coworking y comunidad', active: true },
];

const pan = (code: string, name: string, price: number): Offering => ({
  id: 'pan-' + code.toLowerCase(), projectId: DIVINE_ID, kind: 'producto', code, name, price, active: true, public: true,
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
