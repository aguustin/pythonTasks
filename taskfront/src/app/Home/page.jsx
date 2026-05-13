"use client"
import { useRouter } from "next/navigation"
import { signInRequest } from "../../../api/userRequests"
import '../Home/forms.css'
import { useContext, useState, useEffect } from "react"
import UserContext from "../context/userContext"

function Form() {
    const router = useRouter()
    const { session, authError, logInContext } = useContext(UserContext)
    const [switchForm, setSwitchForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [localError, setLocalError] = useState(null)
    const [successMsg, setSuccessMsg] = useState(null)

    useEffect(() => {
        if (session) router.push('/Tasktables')
    }, [session, router])

    const logIn = async (e) => {
        e.preventDefault()
        setLocalError(null)
        setLoading(true)

        const mail = e.target.elements.mail.value.trim()
        const password = e.target.elements.password.value

        if (!mail || !password) {
            setLocalError('Completá todos los campos.')
            setLoading(false)
            return
        }

        const result = await logInContext(mail, password)
        if (!result.success) {
            setLocalError(result.error)
        }
        setLoading(false)
    }

    const signIn = async (e) => {
        e.preventDefault()
        setLocalError(null)
        setSuccessMsg(null)
        setLoading(true)

        const data = {
            username: e.target.elements.username.value.trim(),
            mail: e.target.elements.mail.value.trim(),
            password: e.target.elements.password.value,
            confirmPassword: e.target.elements.confirmPassword.value,
        }

        if (!data.username || !data.mail || !data.password) {
            setLocalError('Completá todos los campos.')
            setLoading(false)
            return
        }

        try {
            await signInRequest(data)
            setSuccessMsg('¡Cuenta creada! Podés iniciar sesión.')
            setSwitchForm(false)
        } catch (err) {
            setLocalError(err.response?.data?.error || 'Error al registrar. Intentá de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    const errorToShow = localError || authError

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-slate-800">TaskManager</h1>
                    <p className="text-slate-500 mt-2">Organizá tus tareas de forma simple</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <h2 className="text-2xl font-semibold text-slate-800 mb-6">
                        {switchForm ? 'Crear cuenta' : 'Iniciar sesión'}
                    </h2>

                    {errorToShow && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-5 text-sm">
                            {errorToShow}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 mb-5 text-sm">
                            {successMsg}
                        </div>
                    )}

                    {switchForm ? (
                        <form onSubmit={signIn} noValidate>
                            <div className="form-group mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="username">
                                    Nombre de usuario
                                </label>
                                <input
                                    id="username"
                                    className="w-full p-3 rounded-lg border-2 border-slate-200 outline-orange-400 text-slate-800 focus:border-orange-400 transition-colors"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="reg-mail">
                                    Email
                                </label>
                                <input
                                    id="reg-mail"
                                    className="w-full p-3 rounded-lg border-2 border-slate-200 outline-orange-400 text-slate-800 focus:border-orange-400 transition-colors"
                                    name="mail"
                                    type="email"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="reg-password">
                                    Contraseña
                                </label>
                                <input
                                    id="reg-password"
                                    className="w-full p-3 rounded-lg border-2 border-slate-200 outline-orange-400 text-slate-800 focus:border-orange-400 transition-colors"
                                    type="password"
                                    name="password"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <div className="form-group mb-6">
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="confirmPassword">
                                    Confirmar contraseña
                                </label>
                                <input
                                    id="confirmPassword"
                                    className="w-full p-3 rounded-lg border-2 border-slate-200 outline-orange-400 text-slate-800 focus:border-orange-400 transition-colors"
                                    type="password"
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                            <button
                                className="w-full bg-orange-400 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl text-lg transition-colors disabled:opacity-50"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Creando cuenta...' : 'Registrarse'}
                            </button>
                            <div className="text-center mt-5">
                                <button
                                    type="button"
                                    className="text-slate-500 hover:text-orange-400 text-sm transition-colors"
                                    onClick={() => { setSwitchForm(false); setLocalError(null) }}
                                >
                                    ¿Ya tenés cuenta? <span className="font-semibold">Iniciá sesión</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={logIn} noValidate>
                            <div className="form-group mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="mail">
                                    Email
                                </label>
                                <input
                                    id="mail"
                                    className="w-full p-3 rounded-lg border-2 border-slate-200 outline-orange-400 text-slate-800 focus:border-orange-400 transition-colors"
                                    name="mail"
                                    type="email"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div className="form-group mb-6">
                                <label className="block text-sm font-medium text-slate-600 mb-1" htmlFor="password">
                                    Contraseña
                                </label>
                                <input
                                    id="password"
                                    className="w-full p-3 rounded-lg border-2 border-slate-200 outline-orange-400 text-slate-800 focus:border-orange-400 transition-colors"
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                            <button
                                className="w-full bg-orange-400 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl text-lg transition-colors disabled:opacity-50"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? 'Ingresando...' : 'Iniciar sesión'}
                            </button>
                            <div className="text-center mt-5">
                                <button
                                    type="button"
                                    className="text-slate-500 hover:text-orange-400 text-sm transition-colors"
                                    onClick={() => { setSwitchForm(true); setLocalError(null); setSuccessMsg(null) }}
                                >
                                    ¿No tenés cuenta? <span className="font-semibold">Registrate</span>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    )
}

export default Form
