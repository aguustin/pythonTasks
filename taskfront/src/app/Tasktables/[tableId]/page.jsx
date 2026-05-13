"use client"
import { useState, useEffect, useContext } from "react"
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import Link from 'next/link'
import TasksContext from '@/app/context/tasksContext'
import UserContext from '@/app/context/userContext'
import { useToast } from '@/app/context/toastContext'
import {
    getTasksForTable, getTableByIdRequest,
    createCommentRequest, getCommentsRequest, deleteCommentRequest,
} from '../../../../api/taskRequest'
import backImg            from "../../assets/dcclPng/back.png"
import Edit_duotoneImg    from "../../assets/dccl/Edit_duotone.svg"
import coffeeImg          from "../../assets/dcclPng/coffee.png"
import speech_bubbleImg   from "../../assets/dcclPng/speech-bubble.png"
import stack_of_booksImg  from "../../assets/dcclPng/stack-of-books.png"
import stopwatchImg       from "../../assets/dcclPng/stopwatch.png"
import studentImg         from "../../assets/dcclPng/student.png"
import treadmillImg       from "../../assets/dcclPng/treadmill.png"
import deleteImg          from "../../assets/dcclPng/delete.png"
import addlistImg         from '../../assets/dcclPng/addlist.png'
import closeImg           from "../../assets/dcclPng/close.png"
import checkBImg          from "../../assets/dcclPng/checkB.png"
import checkImg           from "../../assets/dcclPng/check.png"
import Time_atack_duotoneImg  from "../../assets/dccl/Time_atack_duotone.svg"
import Done_roundImg          from "../../assets/dccl/Done_round.svg"
import close_ring_duotoneImg  from "../../assets/dccl/close_ring_duotone.svg"
import Trash              from "../../assets/dccl/Trash.svg"

// ── Constantes ───────────────────────────────────────────────────────────────
const ICON_MAP = [coffeeImg, speech_bubbleImg, stack_of_booksImg, stopwatchImg, studentImg, treadmillImg]

const COLUMNS = [
    { id: 0, label: 'In Progress',  bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400', text: 'text-orange-600' },
    { id: 1, label: 'Completed',    bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-400',  text: 'text-green-600'  },
    { id: 2, label: "Won't do",     bg: 'bg-red-50',    border: 'border-red-200',    dot: 'bg-red-400',    text: 'text-red-600'    },
]

const STATE_BTNS = [
    { val: 0, label: 'In Progress', icon: Time_atack_duotoneImg,  color: 'bg-orange-300' },
    { val: 1, label: 'Completed',   icon: Done_roundImg,           color: 'bg-green-300'  },
    { val: 2, label: "Won't do",    icon: close_ring_duotoneImg,   color: 'bg-red-300'    },
]

// ── Due Date Badge ───────────────────────────────────────────────────────────
function DueDateBadge({ dueDate }) {
    if (!dueDate) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate + 'T00:00:00')
    const diff = Math.round((due - today) / 86400000)

    if (diff < 0)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Vencida</span>
    if (diff === 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600 font-medium">Vence hoy</span>
    if (diff <= 3)  return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">En {diff}d</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{due.toLocaleDateString()}</span>
}

// ── Task Card (Draggable) ────────────────────────────────────────────────────
function TaskCard({ task, onClick, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            style={transform ? { transform: `translate(${transform.x}px,${transform.y}px)`, zIndex: 50 } : undefined}
            className={`bg-white rounded-xl p-3 shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md ${isDragging ? 'opacity-40 shadow-xl' : ''}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {ICON_MAP[task.imageType] && <img src={ICON_MAP[task.imageType].src} alt="" className="w-5 h-5 shrink-0" />}
                    <span className="font-semibold text-slate-800 text-sm truncate">{task.title}</span>
                </div>
                <button
                    type="button"
                    className="shrink-0 opacity-30 hover:opacity-100 transition-opacity"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                >
                    <img src={deleteImg.src} alt="Delete" className="w-4 h-4" />
                </button>
            </div>

            {task.description && (
                <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
            )}

            <div className="flex items-center justify-between mt-2.5 gap-2">
                <DueDateBadge dueDate={task.due_date} />
                <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-orange-500 ml-auto shrink-0 transition-colors"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onClick(task) }}
                >
                    Detalle →
                </button>
            </div>
        </div>
    )
}

// ── Kanban Column (Droppable) ────────────────────────────────────────────────
function KanbanColumn({ col, tasks, onCardClick, onDelete }) {
    const { setNodeRef, isOver } = useDroppable({ id: String(col.id) })

    return (
        <div className="flex-1 min-w-[260px] max-w-sm flex flex-col">
            <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${col.dot}`} />
                <h3 className={`font-semibold text-sm ${col.text}`}>{col.label}</h3>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 font-medium">
                    {tasks.length}
                </span>
            </div>
            <div
                ref={setNodeRef}
                className={`flex-1 rounded-2xl p-3 border-2 border-dashed min-h-48 flex flex-col gap-2 transition-colors ${
                    isOver ? 'border-blue-300 bg-blue-50' : `${col.border} ${col.bg}`
                }`}
            >
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={onCardClick} onDelete={onDelete} />
                ))}
                {tasks.length === 0 && !isOver && (
                    <p className="text-xs text-slate-300 text-center mt-10 select-none">Arrastrá una tarea acá</p>
                )}
            </div>
        </div>
    )
}

// ── Comments Section ─────────────────────────────────────────────────────────
function CommentSection({ taskId, session }) {
    const [comments, setComments] = useState([])
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)

    useEffect(() => {
        if (!taskId) return
        getCommentsRequest(taskId).then(r => setComments(r.data)).catch(() => {})
    }, [taskId])

    const submit = async (e) => {
        e.preventDefault()
        if (!text.trim()) return
        setSending(true)
        try {
            const { data } = await createCommentRequest({ taskId, text: text.trim() })
            setComments(prev => [...prev, data])
            setText('')
        } finally {
            setSending(false)
        }
    }

    const remove = async (id) => {
        await deleteCommentRequest(id)
        setComments(prev => prev.filter(c => c.id !== id))
    }

    return (
        <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Comentarios ({comments.length})
            </h4>

            <div className="space-y-2 max-h-44 overflow-y-auto mb-3 pr-1">
                {comments.length === 0 && (
                    <p className="text-xs text-slate-300 text-center py-4">Sin comentarios aún.</p>
                )}
                {comments.map(c => (
                    <div key={c.id} className="bg-slate-50 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-slate-600">{c.username}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-300">
                                    {new Date(c.created_at).toLocaleString()}
                                </span>
                                {c.username === session?.user?.username && (
                                    <button onClick={() => remove(c.id)} className="text-slate-300 hover:text-red-400 transition-colors text-xs">✕</button>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{c.text}</p>
                    </div>
                ))}
            </div>

            <form onSubmit={submit} className="flex gap-2">
                <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Escribí un comentario..."
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-orange-400 text-slate-700"
                />
                <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="text-sm bg-orange-400 hover:bg-orange-500 text-white px-3 py-2 rounded-lg disabled:opacity-40 transition-colors"
                >
                    {sending ? '...' : 'Enviar'}
                </button>
            </form>
        </div>
    )
}

// ── Task Form (Create / Edit) ────────────────────────────────────────────────
function TaskForm({ initial, onSubmit, onCancel, onDelete }) {
    const [taskType, setTaskType] = useState(initial?.imageType ?? 0)
    const [tstate,   setTState]   = useState(initial?.state     ?? 0)
    const [dueDate,  setDueDate]  = useState(initial?.due_date  ?? '')

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({
            title:       e.target.elements.taskTitle.value,
            description: e.target.elements.taskDesc.value,
            imageType:   taskType,
            state:       tstate,
            due_date:    dueDate || null,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre *</label>
                <input
                    className="borders w-full rounded-lg p-2 text-sm font-semibold text-slate-700 outline-orange-400"
                    type="text" name="taskTitle" defaultValue={initial?.title ?? ''} required
                />
            </div>
            <div>
                <label className="text-xs text-slate-400 block mb-1">Descripción</label>
                <textarea
                    className="borders w-full rounded-lg p-2 text-sm text-slate-700 outline-orange-400 resize-none"
                    rows={3} name="taskDesc" defaultValue={initial?.description ?? ''}
                />
            </div>
            <div>
                <label className="text-xs text-slate-400 block mb-1">Fecha límite</label>
                <input
                    type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="borders w-full rounded-lg p-2 text-sm text-slate-700 outline-orange-400"
                />
            </div>
            <div>
                <label className="text-xs text-slate-400 block mb-1">Icono</label>
                <div className="flex gap-1.5 flex-wrap">
                    {ICON_MAP.map((img, i) => (
                        <button key={i} type="button"
                            className={`rounded-lg p-2 transition-colors ${taskType === i ? 'bg-orange-100 ring-2 ring-orange-400' : 'bg-slate-100 hover:bg-slate-200'}`}
                            onClick={() => setTaskType(i)}
                        >
                            <img src={img.src} alt="" className="w-5 h-5" />
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <label className="text-xs text-slate-400 block mb-1">Estado</label>
                <div className="flex gap-1.5">
                    {STATE_BTNS.map(({ val, label, icon, color }) => (
                        <button key={val} type="button"
                            className={`flex-1 flex items-center gap-1 p-2 rounded-lg text-xs border-2 transition-colors ${tstate === val ? 'border-orange-400 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}
                            onClick={() => setTState(val)}
                        >
                            <div className={`${color} rounded p-1 shrink-0`}>
                                <img src={icon.src} alt="" className="w-3.5 h-3.5" />
                            </div>
                            <span className="leading-tight">{label}</span>
                            {tstate === val && <img src={checkImg.src} alt="" className="w-3 h-3 ml-auto shrink-0" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                {initial && onDelete && (
                    <button type="button" onClick={onDelete}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                    >
                        <img src={Trash.src} alt="" className="w-3.5 h-3.5" /> Eliminar
                    </button>
                )}
                <button type="button" onClick={onCancel}
                    className="flex-1 text-sm border border-slate-200 text-slate-500 py-2 rounded-lg hover:bg-slate-50"
                >
                    Cancelar
                </button>
                <button type="submit"
                    className="flex-1 text-sm bg-orange-400 hover:bg-orange-500 text-white py-2 rounded-lg transition-colors"
                >
                    <img src={checkBImg.src} alt="" className="inline w-4 h-4 mr-1" />
                    {initial ? 'Guardar' : 'Crear'}
                </button>
            </div>
        </form>
    )
}

// ── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel }) {
    return (
        <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
                onClick={e => e.stopPropagation()}
            >
                <p className="font-semibold text-slate-700 text-base mb-1">{title}</p>
                {message && <p className="text-slate-400 text-sm mb-5">{message}</p>}
                <div className="flex gap-3 mt-4">
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

// ── Kanban Skeleton ───────────────────────────────────────────────────────────
function KanbanSkeleton() {
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-4 shrink-0">
                <div className="skeleton w-7 h-7 rounded-lg" />
                <div className="skeleton h-6 w-44 rounded" />
                <div className="skeleton ml-auto h-9 w-32 rounded-xl" />
            </div>
            <div className="flex flex-1 gap-5 p-6 overflow-x-auto">
                {[0, 1, 2].map(i => (
                    <div key={i} className="flex-1 min-w-[260px] max-w-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="skeleton w-3 h-3 rounded-full" />
                            <div className="skeleton h-4 w-24 rounded" />
                        </div>
                        <div className="flex-1 rounded-2xl p-3 border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col gap-2 min-h-48">
                            {[0, 1].map(j => (
                                <div key={j} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 space-y-2">
                                    <div className="skeleton h-4 w-3/4 rounded" />
                                    <div className="skeleton h-3 w-full rounded" />
                                    <div className="skeleton h-3 w-1/2 rounded" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Main Page ────────────────────────────────────────────────────────────────
function Page({ params }) {
    const [tableById,    setTableById]    = useState([])
    const [loading,      setLoading]      = useState(true)
    const [editingTitle, setEditingTitle] = useState(false)
    const [panel,        setPanel]        = useState(null)
    const [pendingDelete, setPendingDelete] = useState(null) // taskId to confirm

    const { tasks, setTasks, createTaskContext, updateTaskContext, deleteTaskContext, updateTableContext } = useContext(TasksContext)
    const { session } = useContext(UserContext)
    const { addToast } = useToast()

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )

    // Escape closes panel
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setPanel(null) }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [])

    useEffect(() => {
        setLoading(true)
        Promise.all([
            getTasksForTable(params.tableId).then(r => r.data),
            getTableByIdRequest(params.tableId).then(r => r.data),
        ])
            .then(([tasksData, tableData]) => { setTasks(tasksData); setTableById(tableData) })
            .catch(() => addToast('Error al cargar las tareas', 'error'))
            .finally(() => setLoading(false))
    }, [params.tableId])

    const grouped = COLUMNS.reduce((acc, col) => {
        acc[col.id] = tasks.filter(t => t.state === col.id)
        return acc
    }, {})

    const handleDragEnd = ({ active, over }) => {
        if (!over) return
        const task = tasks.find(t => t.id === active.id)
        const newState = parseInt(over.id)
        if (task && task.state !== newState) {
            updateTaskContext({ taskId: task.id, title: task.title, description: task.description, imageType: task.imageType, state: newState, due_date: task.due_date })
            addToast('Estado actualizado')
        }
    }

    const handleCreate = async (data) => {
        try {
            await createTaskContext({ table_id: params.tableId, ...data })
            setPanel(null)
            addToast('Tarea creada')
        } catch {
            addToast('Error al crear la tarea', 'error')
        }
    }

    const handleUpdate = async (data) => {
        try {
            await updateTaskContext({ taskId: panel.task.id, ...data })
            setPanel(prev => ({ ...prev, task: { ...prev.task, ...data, id: prev.task.id }, mode: 'view' }))
            addToast('Tarea actualizada')
        } catch {
            addToast('Error al guardar los cambios', 'error')
        }
    }

    const executeDelete = async () => {
        const taskId = pendingDelete
        setPendingDelete(null)
        try {
            await deleteTaskContext(taskId)
            setPanel(null)
            addToast('Tarea eliminada')
        } catch {
            addToast('Error al eliminar la tarea', 'error')
        }
    }

    const handleTitleUpdate = async (e) => {
        e.preventDefault()
        const newTitle = e.target.elements.tableTitle.value.trim()
        if (!newTitle) return
        try {
            await updateTableContext(tableById[0].id, newTitle)
            setTableById(prev => prev.map(t => ({ ...t, title: newTitle })))
            setEditingTitle(false)
            addToast('Título actualizado')
        } catch {
            addToast('Error al actualizar el título', 'error')
        }
    }

    if (loading) return <KanbanSkeleton />

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">

            {pendingDelete && (
                <ConfirmModal
                    title="¿Eliminar tarea?"
                    message="Esta acción no se puede deshacer."
                    onConfirm={executeDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            )}

            {/* ── Header ── */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-4 shrink-0">
                <Link href="/Tasktables">
                    <img src={backImg.src} alt="Back" className="w-7 h-7 opacity-60 hover:opacity-100 transition-opacity" />
                </Link>

                {editingTitle ? (
                    <form onSubmit={handleTitleUpdate} className="flex items-center gap-2">
                        <input
                            name="tableTitle"
                            defaultValue={tableById[0]?.title ?? ''}
                            className="text-xl font-bold border-b-2 border-orange-400 outline-none bg-transparent text-slate-800 w-48"
                            autoFocus
                        />
                        <button type="submit" className="text-sm text-orange-500 font-semibold">Guardar</button>
                        <button type="button" onClick={() => setEditingTitle(false)} className="text-sm text-slate-400">Cancelar</button>
                    </form>
                ) : (
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-800">{tableById[0]?.title ?? '—'}</h1>
                        <button onClick={() => setEditingTitle(true)} className="text-slate-300 hover:text-slate-500 transition-colors">
                            <img src={Edit_duotoneImg.src} alt="Edit" className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setPanel({ mode: 'create' })}
                    className="ml-auto flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                >
                    <img src={addlistImg.src} alt="" className="w-4 h-4" />
                    Nueva tarea
                </button>
            </div>

            {/* ── Board + Panel ── */}
            <div className="flex flex-1 overflow-hidden">

                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="flex-1 flex gap-5 p-6 overflow-x-auto">
                        {COLUMNS.map(col => (
                            <KanbanColumn
                                key={col.id}
                                col={col}
                                tasks={grouped[col.id]}
                                onCardClick={task => setPanel({ mode: 'view', task })}
                                onDelete={taskId => setPendingDelete(taskId)}
                            />
                        ))}
                    </div>
                </DndContext>

                {/* Slide-in detail panel */}
                {panel && (
                    <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2">
                                {panel.mode !== 'create' && panel.task && ICON_MAP[panel.task.imageType] && (
                                    <img src={ICON_MAP[panel.task.imageType].src} alt="" className="w-5 h-5" />
                                )}
                                <h3 className="font-semibold text-slate-700 text-sm truncate max-w-[180px]">
                                    {panel.mode === 'create' ? 'Nueva tarea'
                                     : panel.mode === 'edit'   ? 'Editar tarea'
                                     : panel.task.title}
                                </h3>
                            </div>
                            <button onClick={() => setPanel(null)} className="text-slate-300 hover:text-slate-500" title="Cerrar (Esc)">
                                <img src={closeImg.src} alt="Close" className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {panel.mode === 'view' && (
                                <>
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                        {COLUMNS.find(c => c.id === panel.task.state) && (
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                panel.task.state === 0 ? 'bg-orange-100 text-orange-600'
                                              : panel.task.state === 1 ? 'bg-green-100 text-green-600'
                                              : 'bg-red-100 text-red-600'
                                            }`}>
                                                {COLUMNS.find(c => c.id === panel.task.state)?.label}
                                            </span>
                                        )}
                                        <DueDateBadge dueDate={panel.task.due_date} />
                                    </div>

                                    <p className="text-sm text-slate-500 leading-relaxed mb-4">
                                        {panel.task.description || <span className="italic text-slate-300">Sin descripción.</span>}
                                    </p>

                                    <button
                                        onClick={() => setPanel({ mode: 'edit', task: panel.task })}
                                        className="w-full text-sm border border-slate-200 text-slate-600 py-2 rounded-lg hover:bg-slate-50 transition-colors mb-1"
                                    >
                                        Editar tarea
                                    </button>

                                    <CommentSection taskId={panel.task.id} session={session} />
                                </>
                            )}

                            {panel.mode === 'create' && (
                                <TaskForm
                                    onSubmit={handleCreate}
                                    onCancel={() => setPanel(null)}
                                />
                            )}

                            {panel.mode === 'edit' && (
                                <>
                                    <TaskForm
                                        initial={panel.task}
                                        onSubmit={handleUpdate}
                                        onCancel={() => setPanel({ mode: 'view', task: panel.task })}
                                        onDelete={() => setPendingDelete(panel.task.id)}
                                    />
                                    <CommentSection taskId={panel.task.id} session={session} />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Page
