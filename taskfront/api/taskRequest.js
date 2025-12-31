import axios from "axios";

export const getUserTablesRequest = (sessionId) => axios.get(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/get_user_tables/${sessionId}`)

export const getTableRequest = (tableId) => axios.get(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/get_table/${tableId}`)

export const saveTableRequest = (data) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/create_tasks_tables/`, data)

export const updateTableRequest = (taskTableId, tableTitle) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/update_tasks_table/`, {taskTableId, tableTitle})

export const createTaskRequest = (data) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/create_task/`, data)

export const updateTaskRequest = (data) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/update_tasks/`, data)

export const deleteTaskRequest = (taskId) => axios.delete(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/delete_tasks/${taskId}`) 