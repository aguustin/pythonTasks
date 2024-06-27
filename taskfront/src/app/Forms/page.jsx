import { useRouter } from "next/router"
import { getInRequest, signInRequest } from "../../../api/userRequests"


function Form(){

    const router = useRouter

    const signIn = async (e) => {
        e.preventDefault()

        const data = {
            username: e.elements.target.username.value,
            mail: e.elements.target.mail.value,
            password: e.elements.target.password.value,
            confirmPassword: e.elements.target.confirmPassword.value
        }

        await signInRequest(data)

    }

    const getIn = async (e) => {
        e.preventDefault()

        const data = {
            mail: e.elements.target.mail.value,
            password: e.elements.target.password.value
        }

        const res = await getInRequest(data)
    }


    return(
        <>
            <form className="" onSubmit={(e) => signIn(e)}>
                <div className="form-group">
                    <label>Username</label>
                    <input name="username"></input>
                </div>
                <div className="form-group">
                    <label>Mail</label>
                    <input name="mail"></input>
                </div>
                <div className="form-group">
                    <label>Password</label>
                    <input name="password"></input>
                </div>
                <div className="form-group">
                    <label>Confirm Password</label>
                    <input name="confirmPassword"></input>
                </div>
                <button type="submit">Register</button>
            </form>
        </>
    )
}

export default Form