import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Notificaciones — mismo archivo que notificacion.js: toasts no bloqueantes
// (misma duración 3s, mismos tipos ok/error/info, arriba a la derecha).
export type TipoToast = 'ok' | 'error' | 'info';

interface Toast {
    id: number;
    mensaje: string;
    tipo: TipoToast;
}

interface NotificacionCtx {
    mostrarToast: (mensaje: string, tipo?: TipoToast) => void;
}

const Ctx = createContext<NotificacionCtx>({ mostrarToast: () => {} });
const DURACION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const siguienteId = useRef(1);

    const mostrarToast = useCallback((mensaje: string, tipo: TipoToast = 'info') => {
        const id = siguienteId.current++;
        setToasts((prev) => [...prev, { id, mensaje, tipo }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, DURACION_MS);
    }, []);

    const borde = (tipo: TipoToast) =>
        tipo === 'ok' ? 'border-l-[#1DB954]' : tipo === 'error' ? 'border-l-[#E91429]' : 'border-l-[#535353]';
    const colorIcono = (tipo: TipoToast) =>
        tipo === 'ok' ? 'text-[#1DB954]' : tipo === 'error' ? 'text-[#E91429]' : 'text-[#B3B3B3]';

    const value = useMemo(() => ({ mostrarToast }), [mostrarToast]);

    return (
        <Ctx.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed right-5 top-5 z-[9999] flex flex-col gap-2.5">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`flex max-w-[320px] items-center gap-2.5 rounded-lg border-l-4 bg-[#282828] px-[18px] py-3 font-['Poppins',sans-serif] text-[0.85rem] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.6)] ${borde(t.tipo)}`}
                    >
                        <i
                            className={`fa-solid ${t.tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check'} ${colorIcono(t.tipo)}`}
                        ></i>
                        <span>{t.mensaje}</span>
                    </div>
                ))}
            </div>
        </Ctx.Provider>
    );
}

export function useToast(): NotificacionCtx {
    return useContext(Ctx);
}
