"use client"
import Link from "next/link"
import { useContext } from "react"
import UserContext from "../context/userContext"
import { useRouter } from "next/navigation"

function Navbar() {
    const router = useRouter()
    const { session, setSession } = useContext(UserContext)

    const logout = () => {
        setSession('')
        localStorage.clear('credentials')
        router.push('/Home')
    }

    return(
        <>
            <nav className="bg-slate-200 h-20 text-center flex justify-center items-center text-black">
                {session ? <div className="w-64 text-lg flex justify-center">
                    {session ? <button onClick={() => logout()}>Log out</button> : ''}
                </div>:
                <div className="w-64 text-lg flex justify-between">
                    {session ? '' : <Link href="/Home">Login</Link>}
                    {session ? '' : <Link href="/Home">Sign In</Link>}
                </div>}
            </nav>
        </>
    )
}

export default Navbar