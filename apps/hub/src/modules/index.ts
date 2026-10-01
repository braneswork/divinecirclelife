import type { ComponentType } from 'react';
import { pillarOf } from '@dc/core';
import { Ventas } from './Ventas';
import { Clientes } from './Clientes';
import { Caja } from './Caja';
import { Productos, Experiencias } from './Nucleo';
import { Circulo } from './Circulo';
import { Ajustes } from './Ajustes';
import { Entrada } from './Entrada';
import { Salida } from './Salida';
import { Mar } from './Mar';

export type ModuleId = 'ventas' | 'experiencias' | 'clientes' | 'caja' | 'circulo' | 'productos' | 'ajustes' | 'entrada' | 'salida' | 'mar';

/** cada módulo toma el color de un pilar */
export interface ModuleDef { id: ModuleId; label: string; short?: string; icon: string; tone: string; view: ComponentType }

const c = (id: Parameters<typeof pillarOf>[0]) => pillarOf(id)!.color;

/** Los seis círculos alrededor del centro, desde arriba en sentido horario:
    Ventas arriba, Caja abajo, Productos y Experiencias a los lados de arriba. */
export const MODULES: ModuleDef[] = [
  { id: 'ventas', label: 'Ventas', icon: 'ventas', tone: c('imagination'), view: Ventas },
  { id: 'experiencias', label: 'Experiencias', short: 'Exper.', icon: 'experiencias', tone: c('movement'), view: Experiencias },
  { id: 'clientes', label: 'Clientes', icon: 'clientes', tone: c('family'), view: Clientes },
  { id: 'caja', label: 'Caja', icon: 'caja', tone: c('essence'), view: Caja },
  { id: 'circulo', label: 'Círculo', icon: 'circulo', tone: c('nature'), view: Circulo },
  { id: 'productos', label: 'Productos', short: 'Product.', icon: 'productos', tone: c('food'), view: Productos },
];

/** Orden de la navegación de abajo (los pétalos del inicio mantienen su lugar). */
export const NAV_ORDER: ModuleId[] = ['ventas', 'productos', 'experiencias', 'caja', 'clientes', 'circulo'];

/** Círculos que no son pétalos: ajustes (engranaje), + entrada y − salida. */
export const EXTRA: ModuleDef[] = [
  { id: 'ajustes', label: 'Ajustes', icon: 'ajustes', tone: 'var(--gold)', view: Ajustes },
  { id: 'entrada', label: 'Nueva entrada', icon: 'mas', tone: 'var(--ok)', view: Entrada },
  { id: 'salida', label: 'Nueva salida', icon: 'menos', tone: 'var(--bad)', view: Salida },
  { id: 'mar', label: 'Mar', icon: 'experiencias', tone: c('movement'), view: Mar },
];
