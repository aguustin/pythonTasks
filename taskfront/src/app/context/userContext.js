"use client"
import { createContext, useState, useEffect, useContext } from "react"
import { logInRequest } from "../../../api/userRequests"
import TasksContext from "./tasksContext"

const UserContext = createContext()

// Cookie que lee el middleware de Next.js para proteger rutas (no httpOnly — se setea desde JS)
const SESSION_COOKIE = 'taskmanager_session'

const setSessionCookie = () => {
    document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`
}

const clearSessionCookie = () => {
    document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export const UserContextProvider = ({ children }) => {
    const [session, setSession] = useState(null)
    const [sharedT, setSharedT] = useState([])
    const [authError, setAuthError] = useState(null)
    const [tablesLoading, setTablesLoading] = useState(true)
    const { setTables } = useContext(TasksContext)

    // Rehidrata la sesión desde localStorage al montar
    useEffect(() => {
        const stored = localStorage.getItem('credentials')
        if (!stored) {
            setTablesLoading(false)
            return
        }
        try {
            const parsed = JSON.parse(stored)
            setSession(parsed)
            setSessionCookie()
        } catch {
            localStorage.removeItem('credentials')
            setTablesLoading(false)
        }
    }, [])

    // Carga tablas propias y compartidas cuando hay sesión activa
    useEffect(() => {
        if (!session?.user?.id) return
        const backUrl = process.env.NEXT_PUBLIC_BACK_URL
        const token = session?.tokens?.access
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        setTablesLoading(true)
        Promise.all([
            fetch(`${backUrl}/get_user_tables/${session.user.id}/`, { headers }).then(r => r.json()),
            fetch(`${backUrl}/get_shared_tables/${session.user.id}/`, { headers }).then(r => r.json()),
        ])
            .then(([ownTables, shared]) => {
                setTables(Array.isArray(ownTables) ? ownTables : [])
                setSharedT(Array.isArray(shared) ? shared : [])
            })
            .catch(() => {})
            .finally(() => setTablesLoading(false))
    }, [session])

    const logInContext = async (mail, password) => {
        setAuthError(null)
        try {
            const { data } = await logInRequest(mail, password)
            localStorage.setItem('credentials', JSON.stringify(data))
            setSession(data)
            setSessionCookie()
            return { success: true }
        } catch (err) {
            const message = err.response?.data?.error || 'Error al iniciar sesión'
            setAuthError(message)
            return { success: false, error: message }
        }
    }

    const logOutContext = () => {
        localStorage.removeItem('credentials')
        clearSessionCookie()
        setSession(null)
        setTables([])
        setSharedT([])
    }

    return (
        <UserContext.Provider value={{ session, setSession, sharedT, setSharedT, authError, tablesLoading, logInContext, logOutContext }}>
            {children}
        </UserContext.Provider>
    )
}

export default UserContext
