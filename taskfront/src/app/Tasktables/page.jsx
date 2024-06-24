import pruebaImg from '../assets/prueba.jpg'

function TaskTables() {
    return(
        <section className="bg-slate-50 h-screen p-6">
            <div className="text-black w-72 bg-slate-800 text-center shadow-xl shadow-slate-400 rounded-md border-black">
                <div className="h-10 w-full bg-slate-50">
                    <label>Table 1</label>
                </div>
                <img src={pruebaImg.src} alt=""></img>
                <div>
                    <label>2024-02-16</label>
                </div>
            </div>
        </section>
    )
}

export default TaskTables