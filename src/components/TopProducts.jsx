import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export default function TopProducts() {
  const [productosTop, setProductosTop] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchamos solo las ventas completadas para armar el ranking real
    const q = query(collection(db, 'ventas'), where('estado', '==', 'Completado'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conteoProductos = {};

      // 1. Agrupar y contar unidades vendidas y almacenar el último precio visto
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const nombreProd = data.producto || "Producto General";
        const precioProd = data.monto || 0;

        if (!conteoProductos[nombreProd]) {
          conteoProductos[nombreProd] = {
            nombre: nombreProd,
            precio: precioProd,
            unidades: 0
          };
        }
        conteoProductos[nombreProd].unidades += 1;
      });

      // 2. Convertir el objeto a un Array
      const listaOrdenada = Object.values(conteoProductos);

      // 3. Ordenar de mayor a menor según las unidades vendidas
      listaOrdenada.sort((a, b) => b.unidades - a.unidades);

      // 4. Calcular el porcentaje de progreso tomando como base el producto más vendido
      const maxUnidades = listaOrdenada[0]?.unidades || 1;
      
      const listaConProgreso = listaOrdenada.map(prod => ({
        ...prod,
        // Calculamos el porcentaje relativo para la barra de Tailwind
        porcentajeEstilo: { width: `${(prod.unidades / maxUnidades) * 100}%` }
      }));

      // Nos quedamos con el Top 4 para no saturar el diseño
      setProductosTop(listaConProgreso.slice(0, 4));
      setLoading(false);
    }, (error) => {
      console.error("Error al cargar productos top:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between transition-colors min-h-[450px]">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Productos Top</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Artículos con mayor rendimiento comercial.</p>

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">Calculando estadísticas...</p>
        ) : productosTop.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">No hay productos vendidos aún.</p>
        ) : (
          <div className="mt-6 space-y-4">
            {productosTop.map((prod, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                    {prod.nombre}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    ${prod.precio.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Barra de progreso de fondo dinámica */}
                  <div className="w-full bg-slate-50 dark:bg-slate-800/60 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={prod.porcentajeEstilo} 
                    />
                  </div>
                  {/* Contador de unidades real */}
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 min-w-[40px] text-right">
                    {prod.unidades} u.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón Inferior */}
      <div className="border-t border-slate-50 dark:border-slate-800/60 mt-6 pt-4 text-center">
        <button className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-none">
          Analizar Inventario Completo
        </button>
      </div>
    </div>
  );
}