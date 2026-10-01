import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface Action { label: string; run: () => void }
type Show = (msg: string, action?: Action) => void;

const Ctx = createContext<Show>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; action?: Action } | null>(null);
  const timer = useRef<number>(undefined);
  const show = useCallback<Show>((msg, action) => {
    window.clearTimeout(timer.current);
    setToast({ msg, action });
    timer.current = window.setTimeout(() => setToast(null), action ? 6000 : 2600);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          {toast.action && (
            <button onClick={() => { toast.action!.run(); setToast(null); }}>{toast.action.label}</button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
