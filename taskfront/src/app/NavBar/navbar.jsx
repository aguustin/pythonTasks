"use client"
import Link from "next/link"
import { useContext } from "react"
import UserContext from "../context/userContext"
import { useRouter } from "next/navigation"

function Navbar() {
    const router = useRouter()
    const { session, logOutContext } = useContext(UserContext)

    const logout = () => {
        logOutContext()
        router.push('/Home')
    }

    return (
        <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between shadow-sm">
            <Link href={session ? '/Tasktables' : '/Home'} className="font-bold text-xl text-slate-800 hover:text-orange-400 transition-colors">
                TaskManager
            </Link>

            <div className="flex items-center gap-4">
                {session ? (
                    <>
                        <span className="text-sm text-slate-500">
                            Hola, <span className="font-medium text-slate-700">{session.user?.username}</span>
                        </span>
                        <button
                            onClick={logout}
                            className="bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </>
                ) : (
                    <Link
                        href="/Home"
                        className="bg-orange-400 hover:bg-orange-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                        Iniciar sesión
                    </Link>
                )}
            </div>
        </nav>
    )
}

export default Navbar
