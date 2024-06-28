"use client"
import { useContext, useEffect, useState } from "react"
import checkBImg from "../../assets/dcclPng/checkB.png"
import UserContext from "@/app/context/userContext"
import { useRouter } from "next/navigation"
import TasksContext from "@/app/context/tasksContext"

function AddNewTable() {
    const router = useRouter()
    const {session} = useContext(UserContext)
    const {saveTableContext} = useContext(TasksContext)
    const [tableTitle, setTableTitle] = useState()

    const saveTable = async (e) => {
        e.preventDefault()

        const data = {
            userId: session[0].id,
            title: tableTitle
        }

        await saveTableContext(data)
        router.push('/Tasktables')
    }

    return(
        <section className="flex items-center justify-center">
              <form className='shadow-lg mt-20 bg-white rounded-2xl p-4 w-96 mx-auto' onSubmit={(e) => saveTable(e)}>
                    <h2 className="text-black font-semibold text-4xl">Task table</h2>
                    <div className='form-group mt-4'>
                        <label className='text-sm text-slate-400'>Table title</label>
                        <input className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold mt-2 text-black' type="text" name="taskTitle" onChange={(e) => setTableTitle(e.target.value)}></input>
                    </div>
                    <div className='save-table flex'>
                        <button className='bg-orange-300 text-white mx-1 mt-4 flex items-center rounded-lg justify-center font-semibold text-2xl w-full' type="submit">
                            <label className="m-2">Save</label>
                            <img className="m-2" src={checkBImg.src}></img>
                        </button>
                    </div>
                </form>
        </section>
    )
}

export default AddNewTable