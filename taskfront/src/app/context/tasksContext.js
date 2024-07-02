"use client"

import { saveTableRequest, createTaskRequest, updateTableRequest, updateTaskRequest, deleteTaskRequest } from "../../../api/taskRequest";

const { createContext, useState } = require("react");

const TasksContext = createContext()

export const TasksContextProvider = ({children}) => {
    const [tables, setTables] = useState()
    const [tasks, setTasks] = useState([])

    const saveTableContext = async (data) => {
        const res = await saveTableRequest(data)
        console.log(res.data)
        setTables([{...tables, data}])
    }

    const updateTableContext = async (taskTableId, tableTitle) => {
       /* data = {
            taskTableId: taskTableId,

        }*/
        await updateTableRequest(taskTableId, tableTitle)
        location.reload()
    }

    const createTaskContext = async (data) => {
        await createTaskRequest(data)
        setTasks([...tasks, data])
    }

    const updateTaskContext = async (data) => {
        const res = await updateTaskRequest(data)
        console.log("t: ", tasks)
        setTasks(tasks.map((updateTask) => updateTask.id === data.taskId ? {...updateTask, title: data.title, description: data.description, imageType: data.imageType, state: data.state} : updateTask))  //updatear esto en tiempo real
    }

    const deleteTaskContext = async (taskId) => {
        console.log("deleting")
        await deleteTaskRequest(taskId)
        location.reload()
    }

    return(
        <TasksContext.Provider value={{tasks, setTasks, tables, setTables, saveTableContext, updateTableContext, createTaskContext, updateTaskContext, deleteTaskContext }}>{children}</TasksContext.Provider>
    )
}

export default TasksContext