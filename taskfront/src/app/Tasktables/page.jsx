import Link from 'next/link';
import pruebaImg from '../assets/prueba.jpg';
import '@/app/Tasktables/tasktable.css'

function TaskTables() {
    return(
        <section className="bg-slate-50 h-screen p-8 flex flex-wrap">
           <Link href="/Tasktables/:tableId"> <div className="taskTable max-h-60 text-black text-center shadow-xl shadow-slate-400 rounded-md border-black rounded-lg m-6">
                    <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                        <label>Table 1</label>
                    </div>
                    <img src={pruebaImg.src} alt=""></img>
                    <div className="h-10 w-full bg-slate-50 flex items-center justify-center">
                        <label>2024-02-16</label>
                    </div>
                </div>
            </Link>
        </section>
    )
}

export default TaskTables