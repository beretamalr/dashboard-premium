import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { DollarSign, Users, TrendingUp, Package, ArrowUpRight } from 'lucide-react';

export default function Dashboard({ darkMode }) {
  const [ventasTotales, setVentasTotales] = useState(0);
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "ventas"), where("empresaId", "==", empresaId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      const listaVentas = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const montoNumerico = parseFloat(data.monto) || 0;
        total += montoNumerico;
        listaVentas.push({ id: doc.id, ...data, monto: montoNumerico });
      });
      setVentasTotales(total);
      setTransacciones(listaVentas);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Estilos condicionales prácticos
  const cardStyles = darkMode 
    ? "bg-[#0f1524] border-slate-800/60 text-white shadow-sm" 
    : "bg-white border-slate-200 text-slate-800 shadow-sm";

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      <div>
        <h1 className={`text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Monitoreo Comercial</h1>
        <p className="text-sm text-slate-400 mt-1">Información comercial en tiempo real de tu sucursal.</p>
      </div>

      {/* Grid de Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`border p-6 rounded-xl flex items-center justify-between transition-colors ${cardStyles}`}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ventas Totales</p>
            <h3 className="text-3xl font-bold">
              {loading ? "..." : `$${ventasTotales.toLocaleString('es-CL', { minimumFractionDigits: 2 })}`}
            </h3>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-lg text-indigo-500">
            <DollarSign size={24} />
          </div>
        </div>

        <div className={`border p-6 rounded-xl flex items-center justify-between transition-colors ${cardStyles}`}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nuevos Clientes</p>
            <h3 className="text-3xl font-bold">0</h3>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-500">
            <Users size={24} />
          </div>
        </div>

        <div className={`border p-6 rounded-xl flex items-center justify-between transition-colors ${cardStyles}`}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Margen Neto</p>
            <h3 className="text-3xl font-bold">0%</h3>
          </div>
          <div className="bg-amber-500/10 p-3 rounded-lg text-amber-500">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Secciones Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`border rounded-xl p-6 transition-colors lg:col-span-2 ${cardStyles}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Historial Reciente</h2>
            <button className="text-xs text-indigo-500 font-semibold hover:underline flex items-center gap-1">
              Ver todo <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-slate-400 text-sm py-4">Cargando transacciones...</p>
            ) : transacciones.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No se registran transacciones para este periodo.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className={`text-xs border-b ${darkMode ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'}`}>
                    <th className="pb-3 font-semibold">ID Documento</th>
                    <th className="pb-3 font-semibold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                  {transacciones.map((t) => (
                    <tr key={t.id} className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                      <td className="py-3 font-mono text-xs text-slate-400">{t.id}</td>
                      <td className="py-3 text-right font-semibold text-emerald-500">+${t.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className={`border rounded-xl p-6 transition-colors flex flex-col justify-between ${cardStyles}`}>
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Productos Top</h2>
            <div className={`border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-2 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <Package size={32} className="text-slate-400" />
              <p className="text-sm font-medium">Sin registros</p>
              <p className="text-slate-400 text-xs px-4">No hay productos vinculados a transacciones procesadas aún.</p>
            </div>
          </div>
          <button className={`w-full mt-6 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors border ${
            darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/50' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}>
            Analizar Inventario Completo
          </button>
        </div>
      </div>
    </div>
  );
}