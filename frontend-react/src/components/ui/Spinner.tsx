// Spinner reutilizable (reemplaza el fa-spinner de las vistas legacy).
export function Spinner({ texto = 'Cargando...' }: { texto?: string }) {
    return (
        <div className="flex items-center gap-2 text-zinc-400" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-green-500" />
            <p className="text-sm">{texto}</p>
        </div>
    );
}
