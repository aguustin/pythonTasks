"use client"
import '../[tableId]/task.css'
import logoImg from "../../assets/dccl/Logo.svg"
import Edit_duotoneImg from "../../assets/dccl/Edit_duotone.svg"
import Done_roundImg from "../../assets/dccl/Done_round.svg"
import Time_atack_duotoneImg from "../../assets/dccl/Time_atack_duotone.svg"
import close_ring_duotoneImg from "../../assets/dccl/close_ring_duotone.svg"
import Trash from "../../assets/dccl/Trash.svg"
import coffeeImg from "../../assets/dcclPng/coffee.png"
import speech_bubbleImg from "../../assets/dcclPng/speech-bubble.png"
import stack_of_booksImg from "../../assets/dcclPng/stack-of-books.png"
import stopwatchImg from "../../assets/dcclPng/stopwatch.png"
import studentImg from "../../assets/dcclPng/student.png"
import treadmillImg from "../../assets/dcclPng/treadmill.png"
import checkImg from "../../assets/dcclPng/check.png"
import checkBImg from "../../assets/dcclPng/checkB.png"
import closeImg from "../../assets/dcclPng/close.png"
import Link from 'next/link'
import TasksContext from '@/app/context/tasksContext'
const { useState, useEffect, useContext } = require("react")

function Page({params}){
    console.log(params.tableId)

    const [tasks, setTasks] = useState([])
    const [displayForm, setDisplayForm] = useState(false)
    const [taskType, setTaskType] = useState()
    const [tstate , setTState] = useState()
    const {tables, createTaskContext} = useContext(TasksContext)

    useEffect(() => {
        fetch(`http://127.0.0.1:8000/get_one_table/${params.tableId}`)
        .then(res => res.json())
        .then((json) => setTasks(json))
    }, [])


    const saveTask = (e) => {
        e.preventDefault()
        table_id = data.get('table_id')
        title = data.get('title')
        description =  data.get('description')
        imageType = data.get('imageType')
        state = data.get('state')

        const data = {
            table_id: tables.id,
            title: taskTitle,
            description: taskDesc,
            imageType: taskType,
            state: tstate
        } 

        createTaskContext(data)
    }

    return(
        <>
            <div className="text-black w-2/3 mx-auto mt-9 p-9 justify-center">
                <div className="flex justify-center items-center">
                    <div>
                        <img src={logoImg.src} alt=""></img>
                    </div>
                    <div>
                        <div className="flex">
                            <h3 className="text-5xl">My Task Board</h3>
                            <img src={Edit_duotoneImg.src} alt=""></img>
                        </div>
                        <label>Tasks to keep ordanised</label>
                    </div>
                </div>
                <button onClick={() => setDisplayForm(!displayForm)} className="yellowColor flex justify-between w-2/3 p-6 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6">
                        <div className='flex justify-between w-1/2 items-center'>
                            <div>
                                <img src={Done_roundImg.src} alt=""></img>
                            </div>
                            <p>Task In Progress</p>
                        </div>
                        <div>
                            <img src={Time_atack_duotoneImg.src} alt=""></img>
                        </div>
                </button>
                <div className="greenColor flex justify-between w-2/3 p-6 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6">
                <div className='flex justify-between w-1/2 items-center'>
                    <div>
                        <img src={Done_roundImg.src} alt=""></img>
                    </div>
                    <p>Task In Progress</p>
                </div>
                    <div>
                        <img src={Time_atack_duotoneImg.src} alt=""></img>
                    </div>
                </div>
                <div className="pinkColor flex justify-between w-2/3 p-6 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6">
                <div className='flex justify-between w-1/2 items-center'>
                    <div>
                        <img src={Done_roundImg.src} alt=""></img>
                    </div>
                    <p>Task In Progress</p>
                </div>
                    <div>
                        <img src={Time_atack_duotoneImg.src} alt=""></img>
                    </div>
                </div>
                <div className="lightblueColor flex justify-between w-2/3 p-6 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6">
                <div className='flex justify-between w-1/2 items-center'>
                    <div>
                        <img src={Done_roundImg.src} alt=""></img>
                    </div>
                    <p>Task In Progress</p>
                </div>
                    <div>
                        <img src={Time_atack_duotoneImg.src} alt=""></img>
                    </div>
                </div>
                <div className="skinColor flex justify-between w-2/3 p-6 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6">
                <div className='flex justify-between w-1/2 items-center'>
                    <div>
                        <img src={Done_roundImg.src} alt=""></img>
                    </div>
                    <p>Task In Progress</p>
                </div>
                    <div>
                        <img src={Time_atack_duotoneImg.src} alt=""></img>
                    </div>
                </div>
                {displayForm && 
                    <form className='form-task  top-10 shadow-lg right-20 bg-white rounded-2xl p-4' onSubmit={(e) => saveTask(e)}>
                        <div className='flex justify-between w-full'>
                            <p>Task details</p>
                            <button onClick={() => setDisplayForm(!displayForm)}><img src={closeImg.src} alt=""></img></button>
                        </div>
                        <div className='form-group mt-4'>
                            <label className='text-sm text-slate-400'>Task name</label>
                            <input className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold mt-2' type="text" name="taskTitle"></input>
                        </div>
                        <div className='form-group mt-4'>
                            <label className='text-sm text-slate-400'>Task description</label>
                            <textarea className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold mt-2' rows={10} type="text" name="taskDesc"></textarea>
                        </div>
                        <div className='form-group mt-4'>
                            <label className='text-sm text-slate-400'>Icon</label>
                            <div className='flex mt-2 ml-2'>
                                <button className='bg-slate-200 rounded-lg p-3' onClick={() => setTaskType(0)}><img src={coffeeImg.src}></img></button>
                                <button className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(1)}><img src={speech_bubbleImg.src}></img></button>
                                <button className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(2)}><img src={stack_of_booksImg.src}></img></button>
                                <button className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(3)}><img src={stopwatchImg.src}></img></button>
                                <button className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(4)}><img src={studentImg.src}></img></button>
                                <button className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(5)}><img src={treadmillImg.src}></img></button>
                            </div>
                        </div>
                        <div className='form-group mt-2'>
                            <label className='text-sm text-slate-400'>Status</label>
                            <div className='status-buttons flex flex-wrap'>
                                <button className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(0)}>
                                    <div className='bg-orange-300 rounded-lg flex items-center justify-center'><img src={Time_atack_duotoneImg.src}></img></div>
                                    <label>In Progress</label>
                                    <img className='w-5' src={checkImg.src}></img>
                                </button>
                                <button className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(1)}>
                                <div className='bg-green-300 rounded-lg flex items-center justify-center'><img src={Done_roundImg.src} alt=""></img></div>
                                    <label>Completed</label>
                                    <img className='w-5' src={checkImg.src}></img>
                                </button>
                                <button className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(2)}>
                                <div className='bg-red-300 rounded-lg flex items-center justify-center'><img src={close_ring_duotoneImg.src} alt=""></img></div>
                                    <label>Won`t do</label>
                                    <img className='w-5' src={checkImg.src}></img>
                                </button>
                            </div>
                        </div>

                        <div className='delete-save flex'>
                            <button className='bg-slate-700 text-white mx-1 flex items-center p-2 rounded-lg justify-between'>
                                <label>Delete</label>
                                <img src={Trash.src}></img>
                            </button>
                            <button className='bg-blue-300 text-white mx-1 flex items-center p-2 rounded-lg justify-between' type="submit">
                                <label>Save</label>
                                <img src={checkBImg.src}></img>
                            </button>
                        </div>
                    </form>
                }
            </div>
        </>
    )
}

export default Page