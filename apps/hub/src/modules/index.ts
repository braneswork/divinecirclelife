import type { ComponentType } from 'react';
import { Pan } from './Pan';
import { Catalogo } from './Catalogo';
import { Circulo } from './Circulo';
import { Ajustes } from './Ajustes';
import { Experiencias, Cafe } from './Pronto';

export type ModuleId = 'pan' | 'experiencias' | 'cafe' | 'circulo' | 'catalogo' | 'ajustes';

/** Los seis pétalos alrededor del centro, en el orden en que se dibujan (desde arriba, en sentido horario). */
export const MODULES: { id: ModuleId; label: string; view: ComponentType; soon?: boolean }[] = [
  { id: 'pan', label: 'Pan', view: Pan },
  { id: 'experiencias', label: 'Experiencias', view: Experiencias, soon: true },
  { id: 'cafe', label: 'Café', view: Cafe, soon: true },
  { id: 'circulo', label: 'Círculo', view: Circulo },
  { id: 'catalogo', label: 'Catálogo', view: Catalogo },
  { id: 'ajustes', label: 'Ajustes', view: Ajustes },
];
