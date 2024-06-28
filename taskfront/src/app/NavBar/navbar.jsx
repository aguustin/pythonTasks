"use client"
import Link from "next/link"
import { useContext } from "react"
import UserContext from "../context/userContext"
import { useRouter } from "next/navigation"

function Navbar() {
    const router = useRouter()
    const { setSession } = useContext(UserContext)

    const logout = () => {
        setSession('')
        localStorage.clear('credentials')
        router.push('/Forms')
    }

    return(
        <>
            <nav className="bg-slate-200 h-20 text-center flex justify-center items-center text-black">
                <div className="w-64 text-lg flex justify-between">
                    <Link href="/Forms">Login</Link>
                    <Link href="/Forms">Sign In</Link>
                    <button onClick={() => logout()}>Log out</button>
                </div>
            </nav>
        </>
    )
}

export default Navbar