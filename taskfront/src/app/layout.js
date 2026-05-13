import { Inter } from "next/font/google"
import Navbar from "./NavBar/navbar"
import "./globals.css"
import { UserContextProvider } from "./context/userContext"
import { TasksContextProvider } from "./context/tasksContext"
import { ToastProvider } from "./context/toastContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
    title: "TaskManager",
    description: "Gestioná tus tareas de forma simple y organizada",
}

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body className={`${inter.className} min-h-screen bg-slate-50`}>
                <TasksContextProvider>
                    <UserContextProvider>
                        <ToastProvider>
                            <Navbar />
                            {children}
                        </ToastProvider>
                    </UserContextProvider>
                </TasksContextProvider>
            </body>
        </html>
    )
}
