"use client"

import { useRouter } from "next/navigation";
import { getTableRequest, saveTableRequest, createTaskRequest, updateTableRequest, updateTaskRequest, deleteTaskRequest } from "../../../api/taskRequest";
import UserContext from "./userContext";

const { createContext, useState, useEffect, useContext} = require("react");

const TasksContext = createContext()

export const TasksContextProvider = ({children}) => {
    const [tables, setTables] = useState()
    const [tasks, setTasks] = useState([])
    const router = useRouter()
   // const {sharedT, setSharedT} = useContext(UserContext)
    

    const getTableContext = async (tableId) => {
        const res = await getTableRequest(tableId)
        setTables(res.data)
    }

    const saveTableContext = async (data) => {
        const res = await saveTableRequest(data)

        if(res.data === 200){
            router.push('/Tasktables')
        }else{
            setTables([...tables, ...res.data])
        }
    }

    const updateTableContext = (taskTableId, tableTitle) => {
        console.log(taskTableId, " ", tableTitle)
        updateTableRequest(taskTableId, tableTitle)
        location.reload()
    }

    const createTaskContext = async (data) => {
        const res = await createTaskRequest(data)
        console.log("res: ", res)
        setTasks([...tasks, res.data])
    }

    const updateTaskContext = (data) => {
        updateTaskRequest(data)
        console.log("t: ", data)
        setTasks(tasks.map((updateTask) => updateTask.id === data.taskId ? {...updateTask, title: data.title, description: data.description, imageType: data.imageType, state: data.state} : updateTask))  //updatear esto en tiempo real
    }

    const deleteTaskContext = (taskId) => {
        console.log("deleting")
        deleteTaskRequest(taskId)
        location.reload()
    }

    return(
        <TasksContext.Provider value={{tasks, setTasks, tables, setTables, getTableContext, saveTableContext, updateTableContext, createTaskContext, updateTaskContext, deleteTaskContext }}>{children}</TasksContext.Provider>
    )
}

export default TasksContext