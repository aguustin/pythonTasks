"use client"
import Link from 'next/link'
import '@/app/Tasktables/tasktable.css'
import { useContext, useState } from 'react'
import UserContext from '../context/userContext'
import TasksContext from '../context/tasksContext'
import { useToast } from '../context/toastContext'

// ── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
    return (
        <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
            >
                <p className="text-slate-700 font-semibold text-base mb-1">¿Eliminar lista?</p>
                <p className="text-slate-400 text-sm mb-5">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 border border-slate-200 text-slate-500 py-2 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-semibold transition-colors"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="taskTable bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="h-10 px-4 flex items-center border-b border-slate-100">
                <div className="skeleton h-4 w-32 rounded" />
            </div>
            <div className="skeleton w-full" style={{ height: 180 }} />
            <div className="h-10 px-4 flex items-center">
                <div className="skeleton h-3 w-20 rounded" />
            </div>
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────
function TaskTables() {
    const { session, sharedT, tablesLoading } = useContext(UserContext)
    const { tables, deleteTableContext } = useContext(TasksContext)
    const { addToast } = useToast()

    const [showSharedTable, setShowSharedTable] = useState(false)
    const [pendingDelete, setPendingDelete] = useState(null) // { id, title }
    const [deleting, setDeleting] = useState(false)

    const displayedTables = showSharedTable ? sharedT : tables
    const isEmpty = !displayedTables || displayedTables.length === 0

    const handleDeleteConfirm = async () => {
        if (!pendingDelete) return
        setDeleting(true)
        try {
            await deleteTableContext(pendingDelete.id)
            addToast(`Lista "${pendingDelete.title}" eliminada`)
        } catch {
            addToast('Error al eliminar la lista', 'error')
        } finally {
            setDeleting(false)
            setPendingDelete(null)
        }
    }

    return (
        <section className="bg-slate-50 min-h-screen p-8">
            {pendingDelete && (
                <ConfirmModal
                    message={`"${pendingDelete.title}" y todas sus tareas serán eliminadas permanentemente.`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => !deleting && setPendingDelete(null)}
                />
            )}

            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">
                            {showSharedTable ? 'Shared with me' : 'My Lists'}
                        </h2>
                        <p className="text-slate-500 mt-1">
                            {showSharedTable
                                ? 'Lists other people shared with you'
                                : `Welcome back, ${session?.user?.username || ''}`}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSharedTable(prev => !prev)}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors shadow-sm ${showSharedTable
                            ? 'bg-orange-400 text-white hover:bg-orange-500'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        {showSharedTable ? '← My Lists' : 'Shared with me'}
                    </button>
                </div>

                <div className="flex flex-wrap gap-6">
                    {/* Add new — always shown in "My Lists" */}
                    {!showSharedTable && (
                        <Link href="/Tasktables/AddNewTable">
                            <div className="taskTable bg-white border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-orange-400 transition-all cursor-pointer">
                                <div className="text-5xl mb-2">+</div>
                                <span className="font-medium text-sm">New List</span>
                            </div>
                        </Link>
                    )}

                    {/* Skeleton while loading */}
                    {tablesLoading && [0, 1, 2].map(i => <SkeletonCard key={i} />)}

                    {/* Empty state */}
                    {!tablesLoading && isEmpty && (
                        <div className="flex-1 flex items-center justify-center py-20 text-slate-400">
                            <p>{showSharedTable
                                ? 'No one has shared lists with you yet.'
                                : 'Create your first list to get started.'}
                            </p>
                        </div>
                    )}

                    {/* Shared tables */}
                    {!tablesLoading && showSharedTable && sharedT?.map(sh => (
                        <Link key={sh.id} href={`/Tasktables/${sh.table_code.id}`}>
                            <div className="taskTable bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden">
                                <div className="h-10 px-4 flex items-center border-b border-slate-100">
                                    <span className="font-semibold text-slate-700 truncate">{sh.table_code.title}</span>
                                </div>
                                {sh.table_code.table_image
                                    ? <img src={sh.table_code.table_image} alt="" className="w-full object-cover" style={{ height: 180 }} />
                                    : <div className="w-full" style={{ height: 180, backgroundColor: sh.table_code.table_color || '#e2e8f0' }} />
                                }
                                <div className="h-10 px-4 flex items-center text-xs text-slate-400">
                                    <span>Shared by {sh.shared_by}</span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {/* Own tables */}
                    {!tablesLoading && !showSharedTable && tables?.map(t => (
                        <div key={t.id} className="taskTable relative group">
                            <Link href={`/Tasktables/${t.id}`}>
                                <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden h-full">
                                    <div className="h-10 px-4 flex items-center border-b border-slate-100">
                                        <span className="font-semibold text-slate-700 truncate">{t.title}</span>
                                    </div>
                                    {t.table_image
                                        ? <img
                                            src={`https://res.cloudinary.com/drmcrdf4r/image/upload/${t.table_image}`}
                                            alt=""
                                            className="w-full object-cover"
                                            style={{ height: 180 }}
                                          />
                                        : <div className="w-full" style={{ height: 180, backgroundColor: t.table_color || '#e2e8f0' }} />
                                    }
                                    <div className="h-10 px-4 flex items-center text-xs text-slate-400">
                                        <span>{t.date}</span>
                                    </div>
                                </div>
                            </Link>

                            {/* Delete button — visible on hover */}
                            <button
                                onClick={e => { e.preventDefault(); setPendingDelete({ id: t.id, title: t.title }) }}
                                className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/80 hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm text-xs font-bold"
                                title="Eliminar lista"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default TaskTables
