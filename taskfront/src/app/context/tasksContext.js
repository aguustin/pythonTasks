"use client"

import { createContext, useState } from "react"
import { useRouter } from "next/navigation"
import {
    getTableByIdRequest,
    saveTableRequest,
    createTaskRequest,
    updateTableRequest,
    updateTaskRequest,
    deleteTaskRequest,
    deleteTableRequest,
} from "../../../api/taskRequest"

const TasksContext = createContext()

export const TasksContextProvider = ({ children }) => {
    const [tables, setTables] = useState([])
    const [tasks, setTasks] = useState([])
    const router = useRouter()

    const getTableContext = async (tableId) => {
        const res = await getTableByIdRequest(tableId)
        setTables(res.data)
    }

    const saveTableContext = async (data) => {
        const res = await saveTableRequest(data)
        // res.data es el array con la nueva tabla creada
        if (Array.isArray(res.data)) {
            setTables(prev => [...(prev || []), ...res.data])
        }
        router.push('/Tasktables')
    }

    const updateTableContext = async (taskTableId, tableTitle) => {
        await updateTableRequest(taskTableId, tableTitle)
        setTables(prev =>
            prev?.map(t => t.id === taskTableId ? { ...t, title: tableTitle } : t)
        )
    }

    const createTaskContext = async (data) => {
        const res = await createTaskRequest(data)
        setTasks(prev => [...prev, res.data])
    }

    const updateTaskContext = async (data) => {
        await updateTaskRequest(data)
        setTasks(prev =>
            prev.map(t =>
                t.id === data.taskId
                    ? { ...t, title: data.title, description: data.description, imageType: data.imageType, state: data.state, due_date: data.due_date ?? t.due_date }
                    : t
            )
        )
    }

    const deleteTaskContext = async (taskId) => {
        await deleteTaskRequest(taskId)
        setTasks(prev => prev.filter(t => t.id !== taskId))
    }

    const deleteTableContext = async (tableId) => {
        await deleteTableRequest(tableId)
        setTables(prev => prev.filter(t => t.id !== tableId))
    }

    return (
        <TasksContext.Provider value={{
            tasks, setTasks,
            tables, setTables,
            getTableContext,
            saveTableContext,
            updateTableContext,
            deleteTableContext,
            createTaskContext,
            updateTaskContext,
            deleteTaskContext,
        }}>
            {children}
        </TasksContext.Provider>
    )
}

export default TasksContext
