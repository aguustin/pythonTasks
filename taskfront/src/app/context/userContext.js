"use client"
import { logInRequest } from "../../../api/userRequests";
import TasksContext from "./tasksContext";

const { createContext, useState, useEffect, useContext } = require("react");

const UserContext = createContext()

export const UserContextProvider = ({children}) => {
    const [session, setSession] = useState(null)
    const {tables, setTables} = useContext(TasksContext)

    useEffect(() => {
        const credentials = JSON.parse(localStorage.getItem('credentials'));
        setSession(credentials);
    }, []);
      
    if(!tables){
        if(session){
                const sessionId = session[0].id
                fetch(`http://127.0.0.1:8000/get_user_tables/${sessionId}`)
                .then((res) => res.json())
                .then((json) => setTables(json))
        }
    }

    const logInContext = async (mail, password) => {
        const res = await logInRequest(mail, password)
        if(res){
            localStorage.setItem('credentials', JSON.stringify(res.data))
            setSession(JSON.parse(localStorage.getItem('credentials')))
        }
        setSession(res.data)
    }

    return(
        <UserContext.Provider value={{session, setSession, logInContext}}>{children}</UserContext.Provider>
    )
}

export default UserContext