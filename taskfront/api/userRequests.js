import axios from "axios";

export const signInRequest = async (data) => await axios.post(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/create_user/`, data)

export const logInRequest = async (mail, password) => await axios.get(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/get_credentials/${mail}/${password}`)

export const deleteRequest = async (userId) => await axios.delete(`${process.env.NEXT_PUBLIC_BACK_URL_DEV}/delete_user/${userId}`)