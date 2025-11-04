import axios from "axios";

export const signInRequest = async (data) => await axios.post(`${process.env.NEXT_PUBLIC_BACK_URL}/create_user/`, data)

export const logInRequest = async (mail, password) => await axios.get(`${process.env.NEXT_PUBLIC_BACK_URL}/get_credentials/${mail}/${password}`)

export const deleteRequest = async (userId) => await axios.delete(`${process.env.NEXT_PUBLIC_BACK_URL}/delete_user/${userId}`)