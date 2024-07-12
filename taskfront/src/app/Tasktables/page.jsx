"use client"
import Link from 'next/link';
import pruebaImg from '../assets/prueba.jpg';
import addlistImg from '../assets/dcclPng/addlist.png'
import '@/app/Tasktables/tasktable.css'
import { useContext, useEffect, useState } from 'react';
import UserContext from '../context/userContext';
import TasksContext from '../context/tasksContext';

function TaskTables() {
    const {session, sharedT, setSharedT} = useContext(UserContext)
    const {tables} = useContext(TasksContext)
    const [showSharedTable, setShowSharedTable] = useState(false)
    //const [sharedT, setSharedT] = useState([])

    /*useEffect(() => {
        if(session){
            fetch(`http://127.0.0.1:8000/get_shared_tables/${session[0]?.id}`)
            .then((res) => res.json())
            .then((json) => setSharedT(json))   
        }
    }, [])*/

    console.log("tables: ", tables)
    console.log("shareds: ", sharedT)
    
    return(
        <>
        <section className="bg-slate-50 h-screen p-8 flex flex-wrap">
            <button onClick={() => setShowSharedTable(!showSharedTable)} className='shared-button bg-slate-50 rounded-lg p-3 shadow-xl shadow-slate-400 text-black fixed z-10 text-lg text-orange-300 font-semibold'>Shared with me</button>
            <div className='add-new-table'>
            <Link href="/Tasktables/AddNewTable">
                    <div className="taskTable max-h-60 text-black text-center shadow-xl shadow-slate-400 rounded-md border-black rounded-lg m-6">
                        <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                            <label>Add a new list</label>
                        </div>
                        <div className='abc flex items-center justify-center'>
                            <img src={addlistImg.src}></img>
                        </div>
                    </div>
            </Link>
            </div>
            {showSharedTable ?
                sharedT?.map((sh) => 
                    <div key={sh.id} className=" max-h-60 text-black text-center shadow-xl shadow-slate-400 rounded-md border-black rounded-lg m-6">
                        <Link className='taskTable bg-slate-900' key={sh.id} href={`/Tasktables/${sh.table_code.id}`}>
                            <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                                <label>{sh.table_code.title}</label>
                            </div>
                            <img src={pruebaImg.src} alt=""></img>
                            <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                                <label>{sh.table_code.date}</label>
                            </div>
                        </Link>
                </div>)
                :
                tables?.map((t) => 
                    <div key={t.id} className=" max-h-60 text-black text-center shadow-xl shadow-slate-400 rounded-md border-black rounded-lg m-6">
                        <Link className='taskTable bg-slate-900' key={t.id} href={`/Tasktables/${t.id}`}>
                            <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                                <label>{t.title}</label>
                            </div>
                            <img src={pruebaImg.src} alt=""></img>
                            <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                                <label>{t.date}</label>
                            </div>
                        </Link>
                </div>)
            }
        </section>
        </>
    )
}

export default TaskTables