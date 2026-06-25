import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { ShoppingBag, Search, Calendar, User, CheckCircle2, XCircle } from 'lucide-react';

export default function Ventas({ darkMode }) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  useEffect(() => {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "ventas"), where("empresaId", "==", empresaId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaVentas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), monto: parseFloat(doc.data().monto) || 0 }));
      setVentas(listaVentas);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const ventasFiltradas = ventas.filter(v => 
    (v.cliente?.toLowerCase() || "").includes(filtroBusqueda.toLowerCase()) ||
    (v.producto?.toLowerCase() || "").includes(filtroBusqueda.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Historial de Ventas</h1>
          <p className="text-sm text-slate-400 mt-1">Registro y auditoría de todas las transacciones de la sucursal.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar..."
            value={filtroBusqueda}
            onChange={(e) => setFiltroBusqueda(e.target.value)}
            className={`w-full text-sm pl-10 pr-4 py-2.5 rounded-lg outline-none transition-colors border ${
              darkMode ? 'bg-[#0f1524] border-slate-800 text-slate-200 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 shadow-sm'
            }`}
          />
        </div>
      </div>

      <div className={`border rounded-xl overflow-hidden shadow-sm transition-colors ${
        darkMode ? 'bg-[#0f1524] border-slate-800/60' : 'bg-white border-slate-200'
      }`}>
        {loading ? (
          <p className="p-8 text-center text-slate-400 text-sm">Cargando transacciones...</p>
        ) : ventasFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShoppingBag className="mx-auto text-slate-400" size={40} />
            <p className="text-sm font-medium">No se encontraron ventas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className={`text-xs uppercase tracking-wider font-semibold border-b ${
                darkMode ? 'bg-[#0a0f1d]/50 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                <tr>
                  <th className="p-4 pl-6">ID Operación</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right pr-6">Monto</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {ventasFiltradas.map((item) => (
                  <tr key={item.id} className={darkMode ? 'text-slate-300 hover:bg-slate-800/10' : 'text-slate-600 hover:bg-slate-50'}>
                    <td className="p-4 pl-6 font-mono text-xs text-slate-400">{item.id}</td>
                    <td className="p-4">{item.cliente || "Consumidor Final"}</td>
                    <td className="p-4 font-medium">{item.producto}</td>
                    <td className="p-4 text-slate-400 text-xs">{item.fecha || "Sin fecha"}</td>
                    <td className={`p-4 text-right pr-6 font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      ${item.monto.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}