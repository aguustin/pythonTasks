"use client"
import { useContext, useState } from "react"
import checkBImg from "../../assets/dcclPng/checkB.png"
import backImg from "../../assets/dcclPng/back.png"
import UserContext from "@/app/context/userContext"
import TasksContext from "@/app/context/tasksContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

const COLORS = [
    { hex: '#60A5FA', tw: 'bg-blue-400' },
    { hex: '#4ADE80', tw: 'bg-green-400' },
    { hex: '#F87171', tw: 'bg-red-400' },
    { hex: '#F472B6', tw: 'bg-pink-400' },
    { hex: '#FACC15', tw: 'bg-yellow-400' },
]

function AddNewTable() {
    const router = useRouter()
    const { session } = useContext(UserContext)
    const { saveTableContext } = useContext(TasksContext)

    const [tableTitle, setTableTitle] = useState('')
    const [friends, setFriends] = useState([])
    const [friendInput, setFriendInput] = useState('')
    const [image, setImage] = useState(null)
    const [color, setColor] = useState('#60A5FA')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState(null)

    const saveTable = async (e) => {
        e.preventDefault()
        if (!session?.user?.id) {
            setError('Sesión inválida. Por favor iniciá sesión nuevamente.')
            return
        }
        if (!tableTitle.trim()) {
            setError('El título es requerido.')
            return
        }

        setSaving(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('userId', session.user.id)
            formData.append('title', tableTitle.trim())
            formData.append('table_color', color)
            if (image) formData.append('table_image', image)
            formData.append('friends', JSON.stringify(friends))

            await saveTableContext(formData)
        } catch {
            setError('Error al guardar la lista. Intentá de nuevo.')
        } finally {
            setSaving(false)
        }
    }

    const addFriend = (e) => {
        e.preventDefault()
        const mail = friendInput.trim()
        if (mail && !friends.includes(mail)) {
            setFriends(prev => [...prev, mail])
            setFriendInput('')
        }
    }

    const removeFriend = (mail) => {
        setFriends(prev => prev.filter(f => f !== mail))
    }

    return (
        <section className="flex items-center justify-center min-h-screen bg-slate-50">
            <Link href="/Tasktables" className='ac absolute left-20'>
                <img src={backImg.src} alt="Back" />
            </Link>

            <form
                className='shadow-lg bg-white rounded-2xl p-6 w-96 mx-auto'
                onSubmit={saveTable}
                encType="multipart/form-data"
            >
                <h2 className="text-black font-semibold text-3xl mb-1">New Task List</h2>
                <p className="text-slate-400 text-sm mb-4">Organise your tasks in a list</p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
                        {error}
                    </div>
                )}

                <div className='form-group mb-4'>
                    <label className='text-sm font-medium text-slate-600 block mb-1'>Title</label>
                    <input
                        className='borders w-full border-current outline-blue-500 rounded-lg p-2 font-semibold text-black'
                        type="text"
                        name="taskTitle"
                        value={tableTitle}
                        onChange={e => setTableTitle(e.target.value)}
                        placeholder="e.g. Work, Personal, Shopping..."
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className='text-sm font-medium text-slate-600 block mb-2'>Cover image (optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setImage(e.target.files[0])}
                        className="text-sm text-slate-500"
                    />
                </div>

                <div className="mb-4">
                    <label className='text-sm font-medium text-slate-600 block mb-2'>Color</label>
                    <div className="flex gap-2">
                        {COLORS.map(c => (
                            <button
                                key={c.hex}
                                type="button"
                                onClick={() => setColor(c.hex)}
                                className={`${c.tw} w-10 h-10 rounded-lg transition-all ${color === c.hex ? 'ring-2 ring-offset-2 ring-slate-500 scale-110' : ''}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mb-4">
                    <label className='text-sm font-medium text-slate-600 block mb-2'>Share with (optional)</label>
                    <div className="flex gap-2">
                        <input
                            className="borders flex-1 rounded-lg p-2 text-black text-sm outline-blue-500"
                            type="email"
                            placeholder="friend@email.com"
                            value={friendInput}
                            onChange={e => setFriendInput(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={addFriend}
                            className="bg-slate-200 text-slate-700 px-3 rounded-lg text-sm font-medium hover:bg-slate-300"
                        >
                            Add
                        </button>
                    </div>
                    {friends.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {friends.map(f => (
                                <li key={f} className="flex justify-between items-center bg-slate-50 rounded px-3 py-1 text-sm text-slate-600">
                                    <span>{f}</span>
                                    <button type="button" onClick={() => removeFriend(f)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    className='bg-orange-400 text-white w-full mt-2 py-3 flex items-center justify-center rounded-xl font-semibold text-lg hover:bg-orange-500 transition-colors disabled:opacity-50'
                    type="submit"
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save List'}
                    {!saving && <img className="ml-2" src={checkBImg.src} alt="" />}
                </button>
            </form>
        </section>
    )
}

export default AddNewTable
