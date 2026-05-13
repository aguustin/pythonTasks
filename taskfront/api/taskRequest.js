import api from './axiosConfig'

// Tablas
export const getUserTablesRequest = (sessionId)   => api.get(`/get_user_tables/${sessionId}/`)
export const getTableByIdRequest  = (tableId)     => api.get(`/get_table/${tableId}/`)
export const getTasksForTable     = (tableId)     => api.get(`/get_one_table/${tableId}/`)
export const saveTableRequest     = (data)        => api.post('/create_tasks_tables/', data)
export const updateTableRequest   = (id, title)   => api.post('/update_tasks_table/', { taskTableId: id, tableTitle: title })
export const deleteTableRequest   = (tableId)     => api.delete(`/delete_tasks_table/${tableId}/`)

// Tareas
export const createTaskRequest  = (data)    => api.post('/create_task/', data)
export const updateTaskRequest  = (data)    => api.post('/update_tasks/', data)
export const deleteTaskRequest  = (taskId)  => api.delete(`/delete_tasks/${taskId}/`)

// Comentarios
export const getCommentsRequest    = (taskId)     => api.get(`/get_comments/${taskId}/`)
export const createCommentRequest  = (data)       => api.post('/create_comment/', data)
export const deleteCommentRequest  = (commentId)  => api.delete(`/delete_comment/${commentId}/`)
