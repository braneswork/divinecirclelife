import type { ComponentType } from 'react';
import { pillarOf } from '@dc/core';
import { Pedidos } from './Pedidos';
import { Clientes } from './Clientes';
import { Caja } from './Caja';
import { Experiencias } from './Experiencias';
import { Circulo } from './Circulo';
import { Catalogo } from './Catalogo';
import { Ajustes } from './Ajustes';

export type ModuleId = 'pedidos' | 'clientes' | 'caja' | 'experiencias' | 'circulo' | 'catalogo' | 'ajustes';

/** cada módulo toma el color de un pilar */
export interface ModuleDef { id: ModuleId; label: string; short?: string; icon: string; tone: string; view: ComponentType }

/** Los seis círculos alrededor del centro, desde arriba en sentido horario. */
export const MODULES: ModuleDef[] = [
  { id: 'pedidos', label: 'Pedidos', icon: 'pedidos', tone: pillarOf('food')!.color, view: Pedidos },
  { id: 'clientes', label: 'Clientes', icon: 'clientes', tone: pillarOf('family')!.color, view: Clientes },
  { id: 'caja', label: 'Caja', icon: 'caja', tone: pillarOf('essence')!.color, view: Caja },
  { id: 'experiencias', label: 'Experiencias', short: 'Exper.', icon: 'experiencias', tone: pillarOf('movement')!.color, view: Experiencias },
  { id: 'circulo', label: 'Círculo', icon: 'circulo', tone: pillarOf('nature')!.color, view: Circulo },
  { id: 'catalogo', label: 'Catálogo', icon: 'catalogo', tone: pillarOf('wisdom')!.color, view: Catalogo },
];

export const AJUSTES: ModuleDef = { id: 'ajustes', label: 'Ajustes', icon: 'ajustes', tone: 'var(--gold)', view: Ajustes };
