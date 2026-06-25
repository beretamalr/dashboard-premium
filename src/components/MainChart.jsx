import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [
  { name: 'Ene', Ingresos: 4000 },
  { name: 'Feb', Ingresos: 3000 },
  { name: 'Mar', Ingresos: 5000 },
  { name: 'Abr', Ingresos: 4500 },
  { name: 'May', Ingresos: 6000 },
  { name: 'Jun', Ingresos: 5500 },
  { name: 'Jul', Ingresos: 7000 },
  { name: 'Ago', Ingresos: 6500 },
  { name: 'Sep', Ingresos: 8000 },
];

// Estilo personalizado para el cuadro flotante al pasar el mouse
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-semibold">
        <p className="text-slate-400 mb-1">{payload[0].payload.name}</p>
        <p className="text-indigo-400 text-sm">Ingresos: ${payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function MainChart() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Rendimiento de Ingresos</h3>
        <p className="text-sm text-slate-500 font-medium">Historial financiero detallado del año en curso.</p>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Definimos el gradiente difuminado */}
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dy={10}
            />
            <YAxis 
              stroke="#94a3b8" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="Ingresos" 
              stroke="#4f46e5" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorIngresos)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}