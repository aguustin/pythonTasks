import axios from "axios";

export const signInRequest = async (data) => await axios.post('http://127.0.0.1:8000/create_user/', data)

export const getInRequest = async (mail, password) => await axios.get(`http://127.0.0.1:8000/get_credentials/${mail}/${password}`)

export const deleteRequest = async (userId) => await axios.delete(`http://127.0.0.1:8000/delete_user/${userId}`)