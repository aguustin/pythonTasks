import axios from "axios";

export const getUserTablesRequest = (sessionId) => axios.get(`${process.env.NEXT_PUBLIC_BACK_URL}/get_user_tables/${sessionId}`)

export const getTableRequest = (tableId) => axios.get(`${process.env.NEXT_PUBLIC_BACK_URL}/get_table/${tableId}`)

export const saveTableRequest = (data) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL}/create_tasks_tables/`, data)

export const updateTableRequest = (taskTableId, tableTitle) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL}/update_tasks_table/`, {taskTableId, tableTitle})

export const createTaskRequest = (data) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL}/create_task/`, data)

export const updateTaskRequest = (data) => axios.post(`${process.env.NEXT_PUBLIC_BACK_URL}/update_tasks/`, data)

export const deleteTaskRequest = (taskId) => axios.delete(`${process.env.NEXT_PUBLIC_BACK_URL}/delete_tasks/${taskId}`) 