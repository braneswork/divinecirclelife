/* Para que cualquier pantalla pueda entrar a otro círculo o volver al centro. */

import { createContext, useContext } from 'react';
import type { ModuleId } from './modules';

export interface Nav { enter: (id: ModuleId, el?: Element | null) => void; leave: () => void; help: (topic?: string) => void }

export const NavContext = createContext<Nav>({ enter: () => {}, leave: () => {}, help: () => {} });
export const useNav = () => useContext(NavContext);
