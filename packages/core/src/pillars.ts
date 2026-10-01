/* Los pilares de Divine Circle: el círculo de inspiración.
   Esencia al centro, seis pilares alrededor (en sentido horario desde arriba).
   Fuente: packages/brand/pilares/ (v1: círculo original, v2: "Nuestros pilares"). */

export type PillarId = 'essence' | 'wisdom' | 'imagination' | 'movement' | 'nature' | 'family' | 'food';

export interface Pillar {
  id: PillarId;
  name: string;
  /** subtítulo: lo que el pilar cultiva */
  sub: string;
  /** nombre en español para la web */
  es: string;
  description: string;
  /** nombres de la primera versión del círculo */
  v1: { name: string; sub: string };
  color: string;
}

export const ESSENCE: Pillar = {
  id: 'essence', name: 'Essence', sub: 'Spirituality', es: 'Esencia',
  description: 'Living in alignment with what matters.',
  v1: { name: 'Essence', sub: 'Spirituality' }, color: '#D4398C',
};

/** Los seis pilares que rodean la esencia, desde arriba en sentido horario. */
export const PILLARS: Pillar[] = [
  { id: 'wisdom', name: 'Wisdom', sub: 'Expansion', es: 'Sabiduría', description: 'Cultivating curiosity and inner wisdom.', v1: { name: 'Knowledge', sub: 'Awareness' }, color: '#9B6BE0' },
  { id: 'imagination', name: 'Imagination', sub: 'Manifestation', es: 'Imaginación', description: 'Expressing our unique gifts and stories.', v1: { name: 'Creativity', sub: 'Expression' }, color: '#E0475B' },
  { id: 'movement', name: 'Movement', sub: 'Adventure', es: 'Movimiento', description: 'Embracing movement, challenge and adventure.', v1: { name: 'Sports', sub: 'Adventure' }, color: '#2FA7C9' },
  { id: 'nature', name: 'Nature', sub: 'Preservation', es: 'Naturaleza', description: 'Honoring, protecting and living in harmony with Earth.', v1: { name: 'Nature', sub: 'Preservation' }, color: '#6DAA3C' },
  { id: 'family', name: 'Family', sub: 'Traditions', es: 'Familia', description: 'Honoring our roots and creating lasting connections.', v1: { name: 'Family', sub: 'Traditions' }, color: '#E57A3C' },
  { id: 'food', name: 'Food', sub: 'Nutrition', es: 'Alimento', description: 'Nourishing our bodies and the planet.', v1: { name: 'Food', sub: 'Nutrition' }, color: '#C9A227' },
];

export const ALL_PILLARS: Pillar[] = [ESSENCE, ...PILLARS];
export const pillarOf = (id?: PillarId) => ALL_PILLARS.find(p => p.id === id);

export const PHILOSOPHY =
  'Creemos en un enfoque integral de la vida, donde cada pilar se nutre y fortalece a los demás. ' +
  'Aquí, el bienestar personal, la conexión con la naturaleza, la creatividad, el movimiento, el aprendizaje, ' +
  'la alimentación consciente y la comunidad se unen para crear experiencias auténticas, humanas y con propósito.';

export const MOTTO = ['Conectar', 'Compartir', 'Crear', 'Crecer'];
