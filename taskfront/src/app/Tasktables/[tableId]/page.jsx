"use client"
import '../[tableId]/task.css'
import logoImg from "../../assets/dccl/Logo.svg"
import Edit_duotoneImg from "../../assets/dccl/Edit_duotone.svg"
import Done_roundImg from "../../assets/dccl/Done_round.svg"
import Time_atack_duotoneImg from "../../assets/dccl/Time_atack_duotone.svg"
import crossImg from "../../assets/dcclPng/cross.png"
import editImg from "../../assets/dcclPng/edit.png"
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
import addlistImg from '../../assets/dcclPng/addlist.png'
import clearImg from "../../assets/dcclPng/clear.png" 
import deleteImg from "../../assets/dcclPng/delete.png"
import backImg from "../../assets/dcclPng/back.png"
import Link from 'next/link'
import TasksContext from '@/app/context/tasksContext'
const { useState, useEffect, useContext } = require("react")

function Page({params}){
    console.log(params.tableId)

    const [displayForm, setDisplayForm] = useState(false)
    const [taskType, setTaskType] = useState()
    const [tstate , setTState] = useState()
    const [editForm, setEditForm] = useState(false)
    const [editInfo, setEditInfo] = useState([])
    const [openFormTitle, setOpenFormTitle] = useState(false)
    const [tableById, setTableById] = useState([])
    let tableTitle = null
    let taskTableId = null
    const {tasks, setTasks , tables, getTableContext, createTaskContext, updateTaskContext, updateTableContext, deleteTaskContext} = useContext(TasksContext)
    
    useEffect(() => {
        fetch(`http://127.0.0.1:8000/get_one_table/${params.tableId}`)
        .then(res => res.json())
        .then((json) => setTasks(json))
       
        fetch(`http://127.0.0.1:8000/get_table/${params.tableId}`)
        .then(res => res.json())
        .then((json) => setTableById(json))
    }, [])
    
    console.log("tasks: ", tasks)
    const saveTask = (e) => {
        e.preventDefault()
        
        const data = {
            id: 0,
            table_id: params.tableId,
            title: e.target.elements.taskTitle.value,
            description: e.target.elements.taskDesc.value,
            imageType: taskType,
            state: tstate
        } 
        createTaskContext(data)

        setDisplayForm(!displayForm)
    }
    
    const editTaskForm = (taskId, title, description, imageType, state) => {
       const data = {
            taskId: taskId,
            title: title,
            description: description,
            imageType: imageType,
            state: state
        }
        setEditForm(!editForm)
        setEditInfo([data])
        setTaskType(imageType)
        setTState(state)
    } 

    const handleUpdateChange = (e, taskId, field) => {
        const newInfo = editInfo.map((edit) => {
            if(edit.taskId === taskId){
                return {...edit, [field]: e.target.value}
            }
            return edit
        })
        setEditInfo(newInfo)
    } 

    const updateTask = (e, taskId, title, description) => {
        e.preventDefault()
        
        const data = {
            taskId: taskId,
            title: title,
            description: description,
            imageType: taskType,
            state: tstate
        }

        updateTaskContext(data)
    }

    const updateTable = (e) => {
        e.preventDefault()
        console.log("estoy saliendo con un chabon ", e.target.elements.tableTitle.value)
        updateTableContext(tableById[0].id, e.target.elements.tableTitle.value)
    }

    if(tasks.length > 0){
        tableTitle = tasks[0].table_code.title
    }


    return(
        <>
            {openFormTitle && 
            <>
            <div className='background-form-title' onClick={() => setOpenFormTitle(!openFormTitle)}></div>
            <form className='form-title p-2 rounded-md shadow-lg text-black text-center fixed bg-slate-200 ' onSubmit={(e) => updateTable(e)}>
                <input className='w-full text-center text-2xl p-3' name="tableTitle" type="text"></input>
                <button className='w-full mt-2 p-2 font-semibold text-lg text-white bg-orange-300' type="submit">Update</button>
            </form>
            </>}
            <div className="tasks-container text-black w-2/3 mx-auto mt-9 p-9 justify-center relative">
            <Link href="/Tasktables" className='absolute'><img src={backImg.src} alt=""></img></Link>
                <div className="flex justify-center items-center">
                    <div className='mr-3'>
                        <img src={logoImg.src} alt=""></img>
                    </div>
                    {tableById.map((tbi) =>
                    <div key={tbi.id}>
                        <div className="flex">                             
                            <h3 className="text-5xl">{tbi.title}</h3>
                            <button className='ml-4' onClick={() => setOpenFormTitle(!openFormTitle)}><img src={Edit_duotoneImg.src} alt=""></img></button>
                        </div>
                        <label>Tasks to keep ordanised</label>
                    </div>)}
                </div>
                <button onClick={() => setDisplayForm(!displayForm)} className="add-task bg-slate-100 flex justify-between w-1/3 p-6 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6">
                        <div className='flex justify-between w-1/2 items-center'>
                            <p>Add New Task</p>
                        </div>
                        <div>
                            <img src={addlistImg.src} alt=""></img>
                        </div>
                </button>
                {tasks.map((t) =>
                <>
                  <div key={t.id} id={t.id} className={`task flex cursor-pointer justify-between w-2/3 p-2 pl-5 pr-5 text-2xl font-semibold items-center rounded-2xl mx-auto mt-6 ${t.state == 0 ? 'bg-orange-300' : t.state == 1 ? 'bg-green-200' : 'bg-red-200'}`}>
                        <div className='flex justify-between w-full items-center'>
                            <div>
                                {t.imageType == 0 && <img src={coffeeImg.src} alt=""></img>}
                                {t.imageType == 1 && <img src={speech_bubbleImg.src} alt=""></img>}
                                {t.imageType == 2 && <img src={stack_of_booksImg.src} alt=""></img>}
                                {t.imageType == 3 && <img src={stopwatchImg.src} alt=""></img>}
                                {t.imageType == 4 && <img src={studentImg.src} alt=""></img>}
                                {t.imageType == 5 && <img src={treadmillImg.src} alt=""></img>}
                            </div>
                            <div className='desc ml-6 mr-6'>
                                <div>
                                    {t.state == 0 && <p>In Progress</p>}
                                    {t.state == 1 && <p>Completed</p>}
                                    {t.state == 2 && <p>Won`t do</p>}
                                    <label className='text-lg'>{t.title}:</label><br></br>
                                    <label className='de text-base'>{t.description}</label>
                                </div>
                                <button onClick={() => editTaskForm(t.id, t.title, t.description, t.imageType, t.state)} className='edit-task'><img src={editImg.src} alt=""></img></button>
                            </div>
                        </div>
                        <div>
                            {t.state == 0 && <div className='p-4 mr-4 bg-orange-400 rounded-lg'><img src={Time_atack_duotoneImg.src} alt=""></img></div>}
                            {t.state == 1 && <div className='p-4 mr-4 bg-green-300 rounded-lg'><img src={Done_roundImg.src} alt=""></img></div>}
                            {t.state == 2 && <div className='p-4 mr-4 bg-red-300 rounded-lg'><img src={crossImg.src} alt=""></img></div>}
                        </div>
                        <button className='clear-button' onClick={() => deleteTaskContext(t.id)}><img src={deleteImg.src}></img></button>
                   </div>
                </>
                )}
                {editInfo &&
                
                    editInfo.map((edit) => 
                    <form className='form-task top-10 shadow-lg right-20 bg-white rounded-2xl p-4' key={edit.taskId} onSubmit={(e) => updateTask(e , edit.taskId, edit.title, edit.description)}>
                         <div className='flex justify-between w-full'>
                            <p>Edit Task</p>
                            <button onClick={() => setEditInfo(!editInfo)}><img src={closeImg.src} alt=""></img></button>
                        </div>
                        <div className='flex justify-between w-full'>
                            <input className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold mt-2' input="text" value={edit.title} onChange={(e) => handleUpdateChange(e, edit.taskId, 'title')}></input>
                        </div>
                        <div className='form-group mt-4'>
                            <label className='text-sm text-slate-400'>Task name</label>
                            <input className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold mt-2' input="text" value={edit.description} onChange={(e) => handleUpdateChange(e, edit.taskId, 'description')}></input>
                        </div>
                        <div className='form-group icon mt-4'>
                            <label className='text-sm text-slate-400'>Icon</label>
                            <div className='flex mt-2 ml-2'>
                                <button type="button" className='bg-slate-200 rounded-lg p-3' onClick={() => setTaskType(0)}><img src={coffeeImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(1)}><img src={speech_bubbleImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(2)}><img src={stack_of_booksImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(3)}><img src={stopwatchImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(4)}><img src={studentImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(5)}><img src={treadmillImg.src}></img></button>
                            </div>
                        </div>
                        <div className='form-group status mt-2'>
                            <label className='text-sm text-slate-400'>Status</label>
                            <div className='status-buttons flex flex-wrap'>
                                    <button type="button" className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(0)}>
                                        <div className='bg-orange-300 rounded-lg flex items-center justify-center'><img src={Time_atack_duotoneImg.src}></img></div>
                                        <label>In Progress</label>
                                        {tstate == 0 && <img className='w-5' src={checkImg.src}></img>}
                                    </button>
                                    <button type="button" className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(1)}>
                                    <div className='bg-green-300 rounded-lg flex items-center justify-center'><img src={Done_roundImg.src} alt=""></img></div>
                                        <label>Completed</label>
                                        {tstate == 1 && <img className='w-5' src={checkImg.src}></img>}
                                    </button>
                                    <button type="button" className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(2)}>
                                    <div className='bg-red-300 rounded-lg flex items-center justify-center'><img src={close_ring_duotoneImg.src} alt=""></img></div>
                                        <label>Won`t do</label>
                                        {tstate == 2 && <img className='w-5' src={checkImg.src}></img>}
                                    </button>
                            </div>
                        </div>
                        <div className='delete-save flex'>
                            <button type="button" className='bg-slate-700 text-white mx-1 flex items-center p-2 rounded-lg justify-between' onClick={() => setEditInfo(!editInfo)}>
                                <label>Delete</label>
                                <img src={Trash.src}></img>
                            </button>
                            <button className='bg-blue-300 text-white mx-1 flex items-center p-2 rounded-lg justify-between' type="submit">
                                <label>Save</label>
                                <img src={checkBImg.src}></img>
                            </button>
                        </div>
                    </form>
                )}
                {displayForm && 
                    <form className='form-task top-10 shadow-lg right-20 bg-white rounded-2xl p-4' onSubmit={(e) => saveTask(e)}>
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
                        <div className='form-group icon mt-4'>
                            <label className='text-sm text-slate-400'>Icon</label>
                            <div className='flex mt-2 ml-2'>
                                <button type="button" className='bg-slate-200 rounded-lg p-3' onClick={() => setTaskType(0)}><img src={coffeeImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(1)}><img src={speech_bubbleImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(2)}><img src={stack_of_booksImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(3)}><img src={stopwatchImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(4)}><img src={studentImg.src}></img></button>
                                <button type="button" className='bg-slate-200 rounded-lg p-3 ml-3' onClick={() => setTaskType(5)}><img src={treadmillImg.src}></img></button>
                            </div>
                        </div>
                        <div className='form-group status mt-2'>
                            <label className='text-sm text-slate-400'>Status</label>
                            <div className='status-buttons flex flex-wrap'>
                                <button type="button" className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(0)}>
                                    <div className='bg-orange-300 rounded-lg flex items-center justify-center'><img src={Time_atack_duotoneImg.src}></img></div>
                                    <label>In Progress</label>
                                    {tstate == 0 && <img className='w-5' src={checkImg.src}></img>}
                                </button>
                                <button type="button" className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(1)}>
                                <div className='bg-green-300 rounded-lg flex items-center justify-center'><img src={Done_roundImg.src} alt=""></img></div>
                                    <label>Completed</label>
                                    {tstate == 1 && <img className='w-5' src={checkImg.src}></img>}
                                </button>
                                <button type="button" className='borders relative flex items-center p-2 justify-between rounded-lg mx-1 mt-2' onClick={() => setTState(2)}>
                                <div className='bg-red-300 rounded-lg flex items-center justify-center'><img src={close_ring_duotoneImg.src} alt=""></img></div>
                                    <label>Won`t do</label>
                                    {tstate == 2 && <img className='w-5' src={checkImg.src}></img>}
                                </button>
                            </div>
                        </div>
                        <div className='delete-save flex'>
                            <button type="button" className='bg-slate-700 text-white mx-1 flex items-center p-2 rounded-lg justify-between' onClick={() => setDisplayForm(!displayForm)}>
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