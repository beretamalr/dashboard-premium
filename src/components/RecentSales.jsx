import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function RecentSales() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Trae solo las últimas 5 transacciones en tiempo real
    const q = query(collection(db, 'ventas'), orderBy('fecha', 'desc'), limit(5));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVentas(lista);
      setLoading(false);
    }, (error) => {
      console.error("Error cargando transacciones recientes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 h-[400px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs transition-colors flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Transacciones Recientes</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Monitoreo de pagos y movimientos en tiempo real.</p>
          </div>
          <Link to="/ventas" className="text-xs font-bold px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors">
            Ver todas
          </Link>
        </div>

        {ventas.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-100 dark:border-slate-800/80 rounded-xl mt-6">
            <CreditCard className="mx-auto text-slate-300 dark:text-slate-700 mb-2" size={32} />
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No hay transacciones registradas.</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">Usa el botón superior para agregar la primera.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {ventas.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm py-1">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                    {item.cliente ? item.cliente.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{item.cliente}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{item.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${item.monto >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.monto >= 0 ? `+$${item.monto}` : `-$${Math.abs(item.monto)}`}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                    {item.idTicket || 'TX-N/A'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}