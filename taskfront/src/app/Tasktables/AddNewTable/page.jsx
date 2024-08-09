"use client"
import { useContext, useEffect, useState } from "react"
import checkBImg from "../../assets/dcclPng/checkB.png"
import UserContext from "@/app/context/userContext"
import { useRouter } from "next/navigation"
import TasksContext from "@/app/context/tasksContext"
import backImg from "../../assets/dcclPng/back.png"
import Link from "next/link"

function AddNewTable() {
    const router = useRouter()
    const {session} = useContext(UserContext)
    const {saveTableContext} = useContext(TasksContext)
    const [tableTitle, setTableTitle] = useState()
    const [friends, setFriends] = useState([])
    const [a, setA] = useState() //agregado al final
    const [image, setImage] = useState(null)
    const [color, setColor] = useState('#ffaeae')

    const saveTable = async (e) => {
        e.preventDefault()
        const formData = new FormData()

        formData.append('userId', session[0].id)
        formData.append('title', tableTitle)
        formData.append('table_color', color)
        
        if(image !== null){
            formData.append('table_image', image)
        }
        const friendsJSON = JSON.stringify(friends);
        formData.append('friends', friendsJSON)
        await saveTableContext(formData)
        router.push('/Tasktables')
    }


    const handleColorChange = (e, color) => {
        e.preventDefault()
        setColor(color)
    }

    console.log(friends) //agregado al final
    const addFriend = (e) => {
        e.preventDefault()
        
        console.log(a)
        setFriends([...friends,a])
    }

/**  user_code_sender_id = data.get('userSenderId')
        table_code_id = data.get('tableId')
        user_receives_mail = data.get('userReceivesMail') */
    return(
        <section className="flex items-center justify-center">
            <Link href="/Tasktables" className='ac absolute left-20'><img src={backImg.src} alt=""></img></Link>
            <form className='shadow-lg mt-20 bg-white rounded-2xl p-4 w-96 mx-auto' onSubmit={(e) => saveTable(e)} encType="multipart/form-data">
                <h2 className="text-black font-semibold text-4xl">Task table</h2>
                <div className='form-group mt-4'>
                    <label className='text-sm text-slate-400'>Table title</label>
                    <input className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold mt-2 text-black' type="text" name="taskTitle" onChange={(e) => setTableTitle(e.target.value)} />
                </div>
                <div className="w-full">
                    <input type="file" id="a;" name="table_image" accept="image/*" onChange={(e) => setImage(e.target.files[0])}/>
                </div>
                <span className="bg-slate-400 w-full"></span>
                <div className="w-full flex justify-between">
                    <button onClick={(e) => handleColorChange(e, '#60A5FA')} type="button" className="bg-blue-400 w-12 h-12 mt-3"></button>
                    <button onClick={(e) => handleColorChange(e, '#4ADE80')} type="button" className="bg-green-400 w-12 h-12 mt-3"></button>
                    <button onClick={(e) => handleColorChange(e, '#F87171')} type="button" className="bg-red-400 w-12 h-12 mt-3"></button>
                    <button onClick={(e) => handleColorChange(e, '#F472B6')} type="button" className="bg-pink-400 w-12 h-12 mt-3"></button>
                    <button onClick={(e) => handleColorChange(e, '#FACC15')} type="button" className="bg-yellow-400 w-12 h-12 mt-3"></button>
                </div>
                <div className="share-with">
                    <h3>share with:</h3>
                    <input className="text-black" type="text" placeholder="friends mail" onChange={(e) => setA(e.target.value)}></input>
                    <button className="text-black" type="button" onClick={(e) => addFriend(e)}>Add</button>
                </div>
                <div className='save-table flex'>
                    <button className='bg-orange-300 text-white mx-1 mt-4 flex items-center rounded-lg justify-center font-semibold text-2xl w-full' type="submit">
                        <label className="m-2">Save</label>
                        <img className="m-2" src={checkBImg.src} />
                    </button>
                </div>
            </form>
        </section>
    )
}

export default AddNewTable