import axios from 'axios'
import api from './axiosConfig'

const API = process.env.NEXT_PUBLIC_BACK_URL

// Endpoints públicos — usan axios directo (sin token)
export const signInRequest = (data)             => axios.post(`${API}/create_user/`, data)
export const logInRequest  = (mail, password)   => axios.post(`${API}/get_credentials/`, { mail, password })

// Endpoints protegidos — usan la instancia autenticada
export const deleteRequest = (userId) => api.delete(`/delete_user/${userId}/`)
