"use client"

import { saveTableRequest, createTaskRequest, updateTaskRequest } from "../../../api/taskRequest";

const { createContext, useState } = require("react");

const TasksContext = createContext()

export const TasksContextProvider = ({children}) => {
    const [tables, setTables] = useState()
    const [tasks, setTasks] = useState([])

    const saveTableContext = async (data) => {
        const res = await saveTableRequest(data)
        console.log(res.data)
        setTables([...tables, data])
    }

    const createTaskContext = async (data) => {
        await createTaskRequest(data)
    }

    const updateTaskContext = async (data) => {
        const res = await updateTaskRequest(data)
        
        setTasks(tasks.map((updateTask) => updateTask.id === data.taskId && [...updateTask, updateTask.title = data.title, updateTask.description = data.description, updateTask.imageType = data.imageType, updateTask.state = data.state]))  //updatear esto en tiempo real
    }

    return(
        <TasksContext.Provider value={{tasks, setTasks, tables, setTables, saveTableContext, createTaskContext, updateTaskContext }}>{children}</TasksContext.Provider>
    )
}

export default TasksContext