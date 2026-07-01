import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  LoaderCircle,
  ShoppingBag,
} from 'lucide-react'

import { db } from '../firebase/firebaseConfig'

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

function fechaHoy() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
}

function esAnulada(venta) {
  return venta.estado === 'Anulada' || venta.estado === 'Anulado'
}

function Tarjeta({ icono: Icono, titulo, valor, detalle }) {
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

      <p className="text-2xl font-bold text-slate-950 dark:text-white">
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
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ventasListas = false
    let productosListos = false

    const terminarCarga = () => {
      if (ventasListas && productosListos) {
        setCargando(false)
      }
    }

    const cancelarVentas = onSnapshot(
      collection(db, 'ventas'),
      (snapshot) => {
        setVentas(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
            monto: Number(documento.data().monto) || 0,
          })),
        )

        ventasListas = true
        terminarCarga()
      },
      () => {
        setError(
          'No fue posible cargar las ventas. Revisa las reglas de Firestore.',
        )

        ventasListas = true
        terminarCarga()
      },
    )

    const cancelarProductos = onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        setProductos(
          snapshot.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          })),
        )

        productosListos = true
        terminarCarga()
      },
      () => {
        setError(
          'No fue posible cargar el inventario. Revisa las reglas de Firestore.',
        )

        productosListos = true
        terminarCarga()
      },
    )

    return () => {
      cancelarVentas()
      cancelarProductos()
    }
  }, [])

  const resumen = useMemo(() => {
    const validas = ventas.filter((venta) => !esAnulada(venta))

    const total = validas.reduce(
      (acumulado, venta) => acumulado + venta.monto,
      0,
    )

    const hoy = fechaHoy()

    const ventasHoy = validas
      .filter((venta) => String(venta.fecha || '').slice(0, 10) === hoy)
      .reduce((acumulado, venta) => acumulado + venta.monto, 0)

    const diasConVentas = new Set(
      validas.map((venta) => venta.fecha).filter(Boolean),
    ).size

    const valorInventario = productos.reduce(
      (acumulado, producto) =>
        acumulado +
        (Number(producto.stockActual) || 0) *
          (Number(producto.costo) || 0),
      0,
    )

    const bajoStock = productos.filter((producto) => {
      const stock = Number(producto.stockActual) || 0
      const minimo = Number(producto.stockMinimo) || 0

      return stock <= minimo
    })

    const recientes = [...ventas]
      .sort((a, b) =>
        String(b.fecha || '').localeCompare(String(a.fecha || '')),
      )
      .slice(0, 5)

    return {
      total,
      ventasHoy,
      diasConVentas,
      valorInventario,
      bajoStock,
      recientes,
      operaciones: validas.length,
    }
  }, [ventas, productos])

  if (cargando) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <LoaderCircle className="animate-spin" size={20} />
          Cargando resumen...
        </div>
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
            B&K Fusión Tech
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Resumen del negocio
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Ventas e inventario compartidos entre ambos usuarios.
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
        <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          icono={CircleDollarSign}
          titulo="Ventas acumuladas"
          valor={formatoCLP.format(resumen.total)}
          detalle={`${resumen.operaciones} operaciones válidas`}
        />

        <Tarjeta
          icono={CalendarDays}
          titulo="Ventas de hoy"
          valor={formatoCLP.format(resumen.ventasHoy)}
          detalle="Monto registrado durante el día"
        />

        <Tarjeta
          icono={ShoppingBag}
          titulo="Días con ventas"
          valor={resumen.diasConVentas}
          detalle="Días con operaciones válidas"
        />

        <Tarjeta
          icono={Boxes}
          titulo="Valor inventario"
          valor={formatoCLP.format(resumen.valorInventario)}
          detalle="Calculado según costo y stock actual"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
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
              className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
            >
              Ver todas
              <ArrowRight size={16} />
            </Link>
          </div>

          {resumen.recientes.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
              Todavía no hay ventas registradas.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {resumen.recientes.map((venta) => (
                <div
                  key={venta.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {venta.producto || 'Sin producto'}
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {venta.categoria || 'Otros'} ·{' '}
                      {venta.fecha || 'Sin fecha'}
                    </p>
                  </div>

                  <p
                    className={
                      esAnulada(venta)
                        ? 'font-bold text-rose-500'
                        : 'font-bold text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {formatoCLP.format(venta.monto)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                Stock crítico
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Productos en o bajo su mínimo.
              </p>
            </div>

            <AlertTriangle size={20} className="text-amber-500" />
          </div>

          {resumen.bajoStock.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
              No hay productos con stock crítico.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {resumen.bajoStock.slice(0, 5).map((producto) => (
                <div
                  key={producto.id}
                  className="flex items-center justify-between gap-3 p-5"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {producto.nombre}
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Mínimo: {producto.stockMinimo || 0}
                    </p>
                  </div>

                  <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                    {producto.stockActual || 0} un.
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}