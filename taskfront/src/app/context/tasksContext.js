"use client"

import { saveTableRequest } from "../../../api/taskRequest";

const { createContext, useState } = require("react");

const TasksContext = createContext()

export const TasksContextProvider = ({children}) => {
    const [tables, setTables] = useState()

    const saveTableContext = async (data) => {
        const res = await saveTableRequest(data)
        console.log(res.data)
        setTables([...tables, data])
    }

    const createTaskContext = async (data) => {

    }

    return(
        <TasksContext.Provider value={{tables, setTables, saveTableContext, createTaskContext}}>{children}</TasksContext.Provider>
    )
}

export default TasksContext