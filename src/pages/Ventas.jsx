import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  CalendarDays,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'

import { auth, db } from '../firebase/firebaseConfig'
import { tieneCodigoSeguridad, verificarCodigoSeguridad } from '../services/securityCode'

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const estados = ['Completada', 'Pendiente', 'Anulada']

function fechaHoy() {
  const fecha = new Date()
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function formularioInicial() {
  return {
    productoId: '',
    producto: '',
    categoria: '',
    monto: '',
    fecha: fechaHoy(),
    estado: 'Completada',
    codigoSeguridad: '',
  }
}

function normalizarEstado(estado) {
  if (estado === 'Completado') return 'Completada'
  if (estado === 'Anulado') return 'Anulada'
  return estado || 'Completada'
}

function estiloEstado(estado) {
  if (estado === 'Completada') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/70'
  }

  if (estado === 'Pendiente') {
    return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/70'
  }

  return 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/70'
}

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [ventaEditando, setVentaEditando] = useState(null)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const cancelarVentas = onSnapshot(
      collection(db, 'ventas'),
      (snapshot) => {
        const lista = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
            monto: Number(documento.data().monto) || 0,
            estado: normalizarEstado(documento.data().estado),
          }))
          .sort((a, b) =>
            String(b.fecha || '').localeCompare(String(a.fecha || '')),
          )

        setVentas(lista)
        setCargando(false)
      },
      (error) => {
        console.error(error)
        setMensaje('No fue posible cargar las ventas.')
        setCargando(false)
      },
    )

    const cancelarProductos = onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        const lista = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
            stockActual: Number(documento.data().stockActual) || 0,
            precioVenta: Number(documento.data().precioVenta) || 0,
          }))
          .sort((a, b) =>
            String(a.nombre || '').localeCompare(String(b.nombre || '')),
          )

        setProductos(lista)
      },
      (error) => {
        console.error(error)
        setMensaje('No fue posible cargar productos del inventario.')
      },
    )

    return () => {
      cancelarVentas()
      cancelarProductos()
    }
  }, [])

  const productosDisponibles = useMemo(
    () => productos.filter((producto) => Number(producto.stockActual) > 0),
    [productos],
  )

  const ventasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return ventas

    return ventas.filter((venta) =>
      [
        venta.idTicket,
        venta.producto,
        venta.categoria,
        venta.estado,
        venta.fecha,
      ]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termino)),
    )
  }, [busqueda, ventas])

  const resumen = useMemo(() => {
    const validas = ventasFiltradas.filter(
      (venta) => venta.estado !== 'Anulada',
    )

    return {
      monto: validas.reduce((acumulado, venta) => acumulado + (Number(venta.monto) || 0), 0),
      operaciones: validas.length,
      anuladas: ventasFiltradas.filter((venta) => venta.estado === 'Anulada')
        .length,
    }
  }, [ventasFiltradas])

  const seleccionarProducto = (productoId) => {
    const producto = productos.find((item) => item.id === productoId)

    if (!producto) {
      setFormulario({
        ...formulario,
        productoId: '',
        producto: '',
        categoria: '',
        monto: '',
      })
      return
    }

    setFormulario({
      ...formulario,
      productoId: producto.id,
      producto: producto.nombre || '',
      categoria: producto.categoria || 'Otros',
      monto: String(Number(producto.precioVenta) || 0),
    })
  }

  const abrirCrear = () => {
    setVentaEditando(null)
    setFormulario(formularioInicial())
    setModalAbierto(true)
  }

  const abrirEditar = (venta) => {
    setVentaEditando(venta)

    setFormulario({
      productoId: venta.productoId || '',
      producto: venta.producto || '',
      categoria: venta.categoria || 'Otros',
      monto: String(venta.monto || ''),
      fecha: venta.fecha || fechaHoy(),
      estado: normalizarEstado(venta.estado),
      codigoSeguridad: '',
    })

    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (guardando) return
    setModalAbierto(false)
    setVentaEditando(null)
    setFormulario(formularioInicial())
  }

  const descontarStock = async (productoId) => {
    const producto = productos.find((item) => item.id === productoId)

    if (!producto) return

    const stockActual = Number(producto.stockActual) || 0

    if (stockActual <= 0) {
      throw new Error('Este producto no tiene stock disponible.')
    }

    await updateDoc(doc(db, 'productos', productoId), {
      stockActual: stockActual - 1,
      actualizadoPor: auth.currentUser?.email || null,
      updatedAt: serverTimestamp(),
    })
  }

  const guardarVenta = async (event) => {
    event.preventDefault()
    setMensaje('')

    if (!tieneCodigoSeguridad()) {
      setMensaje('Primero configura un código de seguridad en Ajustes.')
      return
    }

    const codigoValido = await verificarCodigoSeguridad(
      formulario.codigoSeguridad,
    )

    if (!codigoValido) {
      setMensaje('Debes ingresar un código de seguridad válido.')
      return
    }

    const monto = Number(formulario.monto)

    if (!formulario.productoId && !ventaEditando) {
      setMensaje('Debes seleccionar un producto del inventario.')
      return
    }

    if (!formulario.producto.trim()) {
      setMensaje('Debes indicar el producto.')
      return
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      setMensaje('El monto debe ser mayor que cero.')
      return
    }

    const datos = {
      productoId: formulario.productoId || null,
      producto: formulario.producto.trim(),
      categoria: formulario.categoria || 'Otros',
      monto,
      fecha: formulario.fecha,
      estado: formulario.estado,
      actualizadoPor: auth.currentUser?.email || null,
      updatedAt: serverTimestamp(),
    }

    try {
      setGuardando(true)

      if (ventaEditando) {
        await updateDoc(doc(db, 'ventas', ventaEditando.id), datos)
        setMensaje('Venta actualizada correctamente.')
      } else {
        await addDoc(collection(db, 'ventas'), {
          ...datos,
          idTicket: `V-${Date.now().toString().slice(-6)}`,
          creadoPor: auth.currentUser?.email || null,
          createdAt: serverTimestamp(),
        })

        if (formulario.estado === 'Completada') {
          await descontarStock(formulario.productoId)
        }

        setMensaje('Venta registrada y stock descontado correctamente.')
      }

      cerrarModal()
    } catch (error) {
      console.error(error)
      setMensaje(error.message || 'No se pudo guardar la venta.')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarVenta = async (venta) => {
    const confirmar = window.confirm(
      `Se eliminará la venta ${venta.idTicket || venta.id}.`,
    )

    if (!confirmar) return

    try {
      await deleteDoc(doc(db, 'ventas', venta.id))
      setMensaje('Venta eliminada correctamente.')
    } catch (error) {
      console.error(error)
      setMensaje('No se pudo eliminar la venta.')
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Operación comercial
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Ventas
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Registro compartido de ventas de B&K Fusión Tech.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
        >
          <Plus size={18} />
          Registrar venta
        </button>
      </div>

      {mensaje && (
        <div className="mb-5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-200">
          {mensaje}
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total filtrado
          </p>
          <p className="mt-2 text-2xl font-bold dark:text-white">
            {formatoCLP.format(resumen.monto)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Operaciones válidas
          </p>
          <p className="mt-2 text-2xl font-bold dark:text-white">
            {resumen.operaciones}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ventas anuladas
          </p>
          <p className="mt-2 text-2xl font-bold dark:text-white">
            {resumen.anuladas}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative max-w-xl">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar producto, categoría, fecha o estado"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {cargando ? (
          <div className="grid min-h-64 place-items-center text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando ventas...
            </div>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <ShoppingBag className="mx-auto mb-3 text-slate-400" size={28} />
              <p className="font-semibold dark:text-white">
                No hay ventas para mostrar
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Registra la primera venta desde el botón superior.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {ventasFiltradas.map((venta) => (
                <article
                  key={venta.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {venta.idTicket || venta.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                        {venta.producto}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {venta.categoria} · {venta.fecha}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estiloEstado(
                        venta.estado,
                      )}`}
                    >
                      {venta.estado}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatoCLP.format(venta.monto)}
                    </p>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEditar(venta)}
                        className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarVenta(venta)}
                        className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Operación</th>
                    <th className="px-5 py-4">Producto</th>
                    <th className="px-5 py-4">Categoría</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Monto</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ventasFiltradas.map((venta) => (
                    <tr key={venta.id}>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">
                        {venta.idTicket || venta.id.slice(0, 8)}
                      </td>
                      <td className="px-5 py-4 font-medium dark:text-white">
                        {venta.producto}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {venta.categoria}
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                        {venta.fecha}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estiloEstado(
                            venta.estado,
                          )}`}
                        >
                          {venta.estado}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatoCLP.format(venta.monto)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(venta)}
                            className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            type="button"
                            onClick={() => eliminarVenta(venta)}
                            className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-60 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardarVenta}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111827] sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-500">
                  {ventaEditando ? 'Editar operación' : 'Nueva operación'}
                </p>

                <h2 className="mt-1 text-xl font-bold dark:text-white">
                  {ventaEditando ? 'Editar venta' : 'Registrar venta'}
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <ShoppingBag size={16} />
                  Producto del inventario
                </span>

                <select
                  required={!ventaEditando}
                  value={formulario.productoId}
                  onChange={(event) => seleccionarProducto(event.target.value)}
                  disabled={Boolean(ventaEditando)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
                >
                  <option value="">
                    Selecciona un producto del inventario
                  </option>

                  {productosDisponibles.map((producto) => (
                    <option key={producto.id} value={producto.id}>
                      {producto.nombre} · Stock {producto.stockActual} ·{' '}
                      {formatoCLP.format(producto.precioVenta)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Categoría
                  </span>

                  <input
                    readOnly
                    value={formulario.categoria}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Estado
                  </span>

                  <select
                    value={formulario.estado}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        estado: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {estados.map((estado) => (
                      <option key={estado}>{estado}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Monto CLP
                  </span>

                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={formulario.monto}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        monto: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <CalendarDays size={16} />
                    Fecha
                  </span>

                  <input
                    required
                    type="date"
                    value={formulario.fecha}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        fecha: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Código de seguridad
                </span>

                <input
                  required
                  type="password"
                  value={formulario.codigoSeguridad}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      codigoSeguridad: event.target.value,
                    })
                  }
                  placeholder="Ingresa el PIN configurado en Ajustes"
                  autoComplete="one-time-code"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {guardando && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}

                {guardando
                  ? 'Guardando...'
                  : ventaEditando
                    ? 'Actualizar venta'
                    : 'Guardar venta'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}