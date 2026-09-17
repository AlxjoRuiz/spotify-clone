import { useEffect, useRef, useState } from 'react';
import { useNav } from '../navegacion';

// Búsqueda — mismo archivo que vistas/busqueda.js: historial (últimas 5),
// sugerencias y ejecución con debounce. El dibujado de resultados vive en
// vistas/explorar.tsx (antes se dibujaba en #vista-explorar desde acá).
export const HISTORIAL_MAX = 5;
export const BUSQUEDA_DEBOUNCE_MS = 400;

export function obtenerHistorial(): string[] {
    try {
        const raw = localStorage.getItem('historial_busquedas');
        return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
        return [];
    }
}

export function guardarEnHistorial(texto: string): string[] {
    const historial = obtenerHistorial().filter((item) => item.toLowerCase() !== texto.toLowerCase());
    historial.unshift(texto);
    const recortado = historial.slice(0, HISTORIAL_MAX);
    localStorage.setItem('historial_busquedas', JSON.stringify(recortado));
    return recortado;
}

// Estado del input del sidebar: texto, sugerencias y ejecución.
// (Reemplaza los listeners de #input-buscar / #btn-buscar.)
export function useBuscador() {
    const { buscar, ultimaBusqueda } = useNav();
    const [texto, setTexto] = useState('');
    const [sugerencias, setSugerencias] = useState<string[]>([]);
    const temporizador = useRef<number | null>(null);
    const ultimaEjecutada = useRef(ultimaBusqueda);

    const ejecutar = (valor: string) => {
        const t = valor.trim();
        if (!t) return;
        setSugerencias(guardarEnHistorial(t));
        ultimaEjecutada.current = t;
        buscar(t);
    };

    const onInput = (valor: string) => {
        setTexto(valor);
        if (temporizador.current) window.clearTimeout(temporizador.current);
        temporizador.current = window.setTimeout(() => {
            const t = valor.trim();
            if (t && t !== ultimaEjecutada.current) ejecutar(t);
        }, BUSQUEDA_DEBOUNCE_MS);
    };

    // Evita que un debounce pendiente navegue después de desmontar el sidebar.
    useEffect(() => () => {
        if (temporizador.current) window.clearTimeout(temporizador.current);
    }, []);

    const elegirSugerencia = (s: string) => {
        setTexto(s);
        ejecutar(s);
    };

    const recargarSugerencias = () => setSugerencias(obtenerHistorial());

    return { texto, sugerencias, onInput, ejecutar, elegirSugerencia, recargarSugerencias };
}
