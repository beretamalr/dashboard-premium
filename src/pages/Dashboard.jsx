import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  ShoppingBag,
  UsersRound,
} from 'lucide-react'

import { db } from '../firebase/firebaseConfig'

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

function normalizarEstado(estado) {
  if (!estado) return 'Completada'
  if (estado === 'Completado') return 'Completada'
  if (estado === 'Anulado') return 'Anulada'

  return estado
}

function esVentaAnulada(venta) {
  return normalizarEstado(venta.estado) === 'Anulada'
}

function obtenerUltimosSieteDias() {
  const dias = []
  const hoy = new Date()

  hoy.setHours(0, 0, 0, 0)

  for (let indice = 6; indice >= 0; indice -= 1) {
    const fecha = new Date(hoy)

    fecha.setDate(hoy.getDate() - indice)

    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')

    dias.push({
      clave: `${anio}-${mes}-${dia}`,
      etiqueta: new Intl.DateTimeFormat('es-CL', {
        weekday: 'short',
      })
        .format(fecha)
        .replace('.', ''),
      total: 0,
    })
  }

  return dias
}

function formatearFecha(fecha) {
  if (!fecha) {
    return 'Sin fecha'
  }

  const partes = String(fecha).slice(0, 10).split('-').map(Number)

  if (partes.length !== 3) {
    return fecha
  }

  const [anio, mes, dia] = partes

  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(anio, mes - 1, dia))
}

function fechaHoy() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function inicioSemanaActual() {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diferencia = dia === 0 ? -6 : 1 - dia
  const lunes = new Date(hoy)

  lunes.setDate(hoy.getDate() + diferencia)

  const anio = lunes.getFullYear()
  const mes = String(lunes.getMonth() + 1).padStart(2, '0')
  const diaMes = String(lunes.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${diaMes}`
}

function TarjetaKpi({ icono: Icono, titulo, valor, detalle }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {titulo}
        </p>

        <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icono size={20} />
        </div>
      </div>

      <p className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
        {valor}
      </p>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {detalle}
      </p>
    </article>
  )
}

export default function Dashboard() {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const empresaId = localStorage.getItem('empresaId')

    if (!empresaId) {
      setError('No se encontró una empresa asociada a esta sesión.')
      setCargando(false)
      return undefined
    }

    const consulta = query(
      collection(db, 'ventas'),
      where('empresaId', '==', empresaId),
    )

    const cancelar = onSnapshot(
      consulta,
      (snapshot) => {
        const listaVentas = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
            monto: Number(documento.data().monto) || 0,
            estado: normalizarEstado(documento.data().estado),
            categoria: documento.data().categoria || 'Otros',
          }))
          .sort((a, b) =>
            String(b.fecha || '').localeCompare(String(a.fecha || '')),
          )

        setVentas(listaVentas)
        setCargando(false)
      },
      (firebaseError) => {
        console.error('Error cargando dashboard:', firebaseError)

        setError(
          'No fue posible cargar las ventas. Revisa las reglas de Firestore.',
        )

        setCargando(false)
      },
    )

    return cancelar
  }, [])

  const resumen = useMemo(() => {
    const ventasValidas = ventas.filter((venta) => !esVentaAnulada(venta))
    const ventasAnuladas = ventas.filter(esVentaAnulada)

    const hoy = fechaHoy()
    const inicioSemana = inicioSemanaActual()
    const mesActual = hoy.slice(0, 7)

    const totalVentas = ventasValidas.reduce(
      (acumulado, venta) => acumulado + venta.monto,
      0,
    )

    const ventasHoy = ventasValidas
      .filter((venta) => String(venta.fecha || '').slice(0, 10) === hoy)
      .reduce((acumulado, venta) => acumulado + venta.monto, 0)

    const ventasSemana = ventasValidas
      .filter((venta) => {
        const fechaVenta = String(venta.fecha || '').slice(0, 10)
        return fechaVenta >= inicioSemana && fechaVenta <= hoy
      })
      .reduce((acumulado, venta) => acumulado + venta.monto, 0)

    const ventasMes = ventasValidas
      .filter((venta) =>
        String(venta.fecha || '').slice(0, 10).startsWith(mesActual),
      )
      .reduce((acumulado, venta) => acumulado + venta.monto, 0)

    const clientes = new Set(
      ventasValidas
        .map((venta) => venta.cliente?.trim().toLowerCase())
        .filter((cliente) => cliente && cliente !== 'consumidor final'),
    )

    const ticketPromedio = ventasValidas.length
      ? totalVentas / ventasValidas.length
      : 0

    const productos = Object.values(
      ventasValidas.reduce((acumulado, venta) => {
        const nombre = venta.producto || 'Sin producto'

        if (!acumulado[nombre]) {
          acumulado[nombre] = {
            nombre,
            categoria: venta.categoria || 'Otros',
            total: 0,
            unidades: 0,
          }
        }

        acumulado[nombre].total += venta.monto
        acumulado[nombre].unidades += 1

        return acumulado
      }, {}),
    )
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    const grafico = obtenerUltimosSieteDias()

    ventasValidas.forEach((venta) => {
      const dia = grafico.find(
        (item) => item.clave === String(venta.fecha || '').slice(0, 10),
      )

      if (dia) {
        dia.total += venta.monto
      }
    })

    return {
      totalVentas,
      ventasHoy,
      ventasSemana,
      ventasMes,
      clientes: clientes.size,
      ticketPromedio,
      productos,
      grafico,
      recientes: ventas.slice(0, 5),
      operacionesValidas: ventasValidas.length,
      operacionesAnuladas: ventasAnuladas.length,
    }
  }, [ventas])

  const maximoGrafico = Math.max(
    ...resumen.grafico.map((dia) => dia.total),
    1,
  )

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Panel comercial
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Resumen de ventas
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Las ventas anuladas no se incluyen en los indicadores principales.
          </p>
        </div>

        <Link
          to="/ventas"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
        >
          <ShoppingBag size={18} />
          Registrar venta
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f1524]">
          <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
            <LoaderCircle size={20} className="animate-spin" />
            Cargando métricas...
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaKpi
              icono={CircleDollarSign}
              titulo="Ventas de hoy"
              valor={formatoCLP.format(resumen.ventasHoy)}
              detalle="Ingresos válidos registrados hoy"
            />

            <TarjetaKpi
              icono={CalendarDays}
              titulo="Ventas de la semana"
              valor={formatoCLP.format(resumen.ventasSemana)}
              detalle="Desde el lunes hasta hoy"
            />

            <TarjetaKpi
              icono={CircleDollarSign}
              titulo="Ventas del mes"
              valor={formatoCLP.format(resumen.ventasMes)}
              detalle="Ingresos válidos del mes actual"
            />

            <TarjetaKpi
              icono={ClipboardList}
              titulo="Operaciones válidas"
              valor={resumen.operacionesValidas}
              detalle={`${resumen.operacionesAnuladas} anuladas no suman`}
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaKpi
              icono={CircleDollarSign}
              titulo="Ventas acumuladas"
              valor={formatoCLP.format(resumen.totalVentas)}
              detalle="Suma histórica sin anuladas"
            />

            <TarjetaKpi
              icono={UsersRound}
              titulo="Clientes"
              valor={resumen.clientes}
              detalle="Clientes identificados"
            />

            <TarjetaKpi
              icono={CalendarDays}
              titulo="Ticket promedio"
              valor={formatoCLP.format(resumen.ticketPromedio)}
              detalle="Promedio por operación válida"
            />

            <TarjetaKpi
              icono={ClipboardList}
              titulo="Ventas anuladas"
              valor={resumen.operacionesAnuladas}
              detalle="Registros conservados sin impacto financiero"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524] sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Ingresos últimos 7 días
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Solo considera ventas completadas o pendientes no anuladas.
                  </p>
                </div>

                <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  En tiempo real
                </span>
              </div>

              <div className="flex h-56 items-end gap-2 sm:gap-4">
                {resumen.grafico.map((dia) => {
                  const porcentaje = (dia.total / maximoGrafico) * 100

                  return (
                    <div
                      key={dia.clave}
                      className="flex h-full flex-1 flex-col justify-end text-center"
                    >
                      <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {dia.total > 0 ? formatoCLP.format(dia.total) : ''}
                      </p>

                      <div className="relative h-40 overflow-hidden rounded-t-xl bg-slate-100 dark:bg-slate-800">
                        <div
                          className="absolute inset-x-0 bottom-0 rounded-t-xl bg-indigo-600 transition-all duration-500"
                          style={{ height: `${porcentaje}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs capitalize text-slate-500 dark:text-slate-400">
                        {dia.etiqueta}
                      </p>
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524] sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Productos destacados
                  </h2>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Ordenados por ingresos válidos.
                  </p>
                </div>

                <Link
                  to="/ventas"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Ver ventas
                </Link>
              </div>

              {resumen.productos.length === 0 ? (
                <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Aún no hay productos vendidos.
                </div>
              ) : (
                <div className="space-y-4">
                  {resumen.productos.map((producto, indice) => (
                    <div key={producto.nombre}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {indice + 1}. {producto.nombre}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {producto.categoria} · {producto.unidades} ventas
                          </p>
                        </div>

                        <p className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {formatoCLP.format(producto.total)}
                        </p>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{
                            width: `${
                              (producto.total / resumen.productos[0].total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <article className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Ventas recientes
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Últimas operaciones registradas.
                </p>
              </div>

              <Link
                to="/ventas"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
              >
                Ver todas
                <ArrowRight size={16} />
              </Link>
            </div>

            {resumen.recientes.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay ventas todavía. Registra la primera desde el botón superior.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {resumen.recientes.map((venta) => (
                  <div
                    key={venta.id}
                    className="flex items-center justify-between gap-4 p-4 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {venta.producto}
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {venta.cliente || 'Consumidor final'} ·{' '}
                        {formatearFecha(venta.fecha)} ·{' '}
                        {normalizarEstado(venta.estado)}
                      </p>
                    </div>

                    <p
                      className={`shrink-0 font-bold ${
                        esVentaAnulada(venta)
                          ? 'text-rose-500 line-through'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatoCLP.format(venta.monto)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </>
      )}
    </section>
  )
}