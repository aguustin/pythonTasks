"use client"
import { useRouter } from "next/navigation";
import { getInRequest, signInRequest } from "../../../api/userRequests"
import '../Forms/forms.css'
import { useContext, useState } from "react"
import UserContext from "../context/userContext"

function Form(){

    const router = useRouter()
    const { session, logInContext } = useContext(UserContext)
    const [switchForm, setSwitchForm] = useState(false)
    console.log("session: ", session)

    const signIn = async (e) => {
        e.preventDefault()

        const data = {
            username: e.target.elements.username.value,
            mail: e.target.elements.mail.value,
            password: e.target.elements.password.value,
            confirmPassword: e.target.elements.confirmPassword.value
        }

        await signInRequest(data)

    }

    const logIn = async (e) => {
        e.preventDefault()
        
        const mail = e.target.elements.mail.value
        const password = e.target.elements.password.value
        logInContext(mail, password)

    }
    
    if(session){
        router.push('/Tasktables')
    }else{
        console.log('poner mensaje de error al ingresar')
    }

    return(
        <>
            {switchForm ? 
            <form className="forms shadow-lg w-96 mx-auto p-4 mt-40" onSubmit={(e) => signIn(e)}>
                <div className="form-group">
                    <label className="text-black">Username</label>
                    <input className="w-full p-2 rounded-lg outline-blue-500 text-black" name="username"></input>
                </div>
                <div className="form-group">
                    <label className="text-black">Mail</label>
                    <input className="w-full p-2 rounded-lg outline-blue-500 text-black" name="mail"></input>
                </div>
                <div className="form-group">
                    <label className="text-black">Password</label>
                    <input className="w-full p-2 rounded-lg outline-blue-500 text-black" type="password" name="password"></input>
                </div>
                <div className="form-group">
                    <label className="text-black">Confirm Password</label>
                    <input className="w-full p-2 rounded-lg outline-blue-500 text-black" type="password" name="confirmPassword"></input>
                </div>
                <button className="bg-orange-400 w-full p-3 mt-6 text-xl" type="submit">Register</button>
            </form>
            :
            <form className="forms shadow-lg w-96 mx-auto p-4 mt-40" onSubmit={(e) => logIn(e)}>
                <div className="form-group">
                    <label className="text-black">Mail</label>
                    <input className="w-full p-2 rounded-lg outline-blue-500 text-black" name="mail"></input>
                </div>
                <div className="form-group">
                    <label className="text-black">Password</label>
                    <input className="w-full p-2 rounded-lg outline-blue-500 text-black" type="password" name="password"></input>
                </div>
                <button className="bg-orange-400 w-full p-3 mt-6 text-xl" type="submit">Log in</button>
            </form>
        }
        </>
    )
}

export default Form