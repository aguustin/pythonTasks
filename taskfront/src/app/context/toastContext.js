"use client"
import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext()

const ICONS = { success: '✓', error: '✕', warning: '⚠' }
const COLORS = {
    success: 'bg-slate-800 text-white',
    error:   'bg-red-500   text-white',
    warning: 'bg-amber-500 text-white',
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef({})

    const dismiss = useCallback((id) => {
        clearTimeout(timers.current[id])
        delete timers.current[id]
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])
        timers.current[id] = setTimeout(() => dismiss(id), 3500)
    }, [dismiss])

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-[9999] pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`toast-in pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-56 max-w-sm ${COLORS[t.type] ?? COLORS.success}`}
                    >
                        <span className="shrink-0">{ICONS[t.type] ?? ICONS.success}</span>
                        <span className="flex-1 leading-snug">{t.message}</span>
                        <button
                            onClick={() => dismiss(t.id)}
                            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-xs leading-none ml-1"
                            aria-label="Cerrar"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    return useContext(ToastContext)
}
