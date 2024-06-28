import axios from "axios";

export const getUserTablesRequest = (sessionId) => axios.get(`http://127.0.0.1:8000/get_user_tables/${sessionId}`)

export const saveTableRequest = (data) => axios.post('http://127.0.0.1:8000/create_tasks_tables/', data)