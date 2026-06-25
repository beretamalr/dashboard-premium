import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { UserPlus, MoreVertical, Shield } from 'lucide-react';

export default function Usuarios({ darkMode }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empresaActual = localStorage.getItem("empresaId");
    if (!empresaActual) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "usuarios"), where("empresaId", "==", empresaActual));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaUsuarios = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsuarios(listaUsuarios);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Gestión de Usuarios</h1>
          <p className="text-sm text-slate-400 mt-1">Colaboradores registrados con acceso a este panel.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center gap-2 transition-colors shadow-sm">
          <UserPlus size={16} /> Añadir Usuario
        </button>
      </div>

      <div className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
        darkMode ? 'bg-[#0f1524] border-slate-800/60' : 'bg-white border-slate-200'
      }`}>
        {loading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Cargando nómina...</p>
        ) : usuarios.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No se encontraron usuarios.</p>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead className={`text-xs uppercase tracking-wider font-semibold border-b ${
              darkMode ? 'bg-[#0a0f1d]/50 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              <tr>
                <th className="p-4 pl-6">Usuario / Colaborador</th>
                <th className="p-4">Rol asignado</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
              {usuarios.map((user) => (
                <tr key={user.id} className={`transition-colors ${darkMode ? 'text-slate-300 hover:bg-slate-800/20' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <td className="p-4 pl-6">
                    <p className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.nombre}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border font-medium ${
                      darkMode ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      <Shield size={12} className="text-indigo-500" /> {user.rol || user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      user.estado ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                    }`}>
                      {user.estado ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-4 text-center pr-6">
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}