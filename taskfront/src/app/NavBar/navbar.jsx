import Link from "next/link"

function Navbar() {
    return(
        <>
            <nav className="bg-slate-200 h-20 text-center flex justify-center items-center text-black">
                <div className="w-64 text-lg flex justify-between">
                    <Link href="/Login">Login</Link>
                    <Link href="/SignIn">Sign In</Link>
                </div>
            </nav>
        </>
    )
}

export default Navbar