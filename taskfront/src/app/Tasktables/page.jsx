"use client"
import Link from 'next/link';
import pruebaImg from '../assets/prueba.jpg';
import addlistImg from '../assets/dcclPng/addlist.png'
import '@/app/Tasktables/tasktable.css'
import { useContext, useEffect } from 'react';
import UserContext from '../context/userContext';
import TasksContext from '../context/tasksContext';

function TaskTables() {

    const {session} = useContext(UserContext)
    const {tables} = useContext(TasksContext)

    console.log("tl: ", tables)

    return(
        <>
        <section className="bg-slate-50 h-screen p-8 flex flex-wrap">
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
            {tables?.map((t) => <Link key={t.id} href={`/Tasktables/${t.id}`}>
                <div className="taskTable max-h-60 text-black text-center shadow-xl shadow-slate-400 rounded-md border-black rounded-lg m-6">
                    <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                        <label>{t.title}</label>
                    </div>
                    <img src={pruebaImg.src} alt=""></img>
                    <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                        <label>{t.date}</label>
                    </div>
                </div>
            </Link>)}
        </section>
        </>
    )
}

export default TaskTables