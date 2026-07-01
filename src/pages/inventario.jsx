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
  AlertTriangle,
  Boxes,
  LoaderCircle,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { auth, db } from '../firebase/firebaseConfig'

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

const categorias = [
  'Cargadores',
  'Audífonos',
  'Cables',
  'Accesorios',
  'Otros',
]

function formularioInicial() {
  return {
    nombre: '',
    sku: '',
    categoria: 'Otros',
    costo: '',
    precioVenta: '',
    stockActual: '0',
    stockMinimo: '1',
  }
}

function numeroSeguro(valor) {
  return Number(valor) || 0
}

function estadoStock(producto) {
  const stock = numeroSeguro(producto.stockActual)
  const minimo = numeroSeguro(producto.stockMinimo)

  if (stock <= 0) {
    return {
      texto: 'Sin stock',
      clase:
        'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/70',
    }
  }

  if (stock <= minimo) {
    return {
      texto: 'Stock bajo',
      clase:
        'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/70',
    }
  }

  return {
    texto: 'Disponible',
    clase:
      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/70',
  }
}

export default function Inventario() {
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const cancelar = onSnapshot(
      collection(db, 'productos'),
      (snapshot) => {
        const lista = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
          .sort((a, b) =>
            String(a.nombre || '').localeCompare(String(b.nombre || '')),
          )

        setProductos(lista)
        setCargando(false)
      },
      (error) => {
        console.error(error)

        setMensaje(
          'No fue posible cargar los productos. Revisa las reglas de Firestore.',
        )

        setCargando(false)
      },
    )

    return cancelar
  }, [])

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    if (!termino) return productos

    return productos.filter((producto) =>
      [producto.nombre, producto.sku, producto.categoria]
        .filter(Boolean)
        .some((valor) =>
          String(valor).toLowerCase().includes(termino),
        ),
    )
  }, [busqueda, productos])

  const resumen = useMemo(() => {
    const unidades = productos.reduce(
      (acumulado, producto) =>
        acumulado + numeroSeguro(producto.stockActual),
      0,
    )

    const valor = productos.reduce(
      (acumulado, producto) =>
        acumulado +
        numeroSeguro(producto.stockActual) *
          numeroSeguro(producto.costo),
      0,
    )

    const bajos = productos.filter(
      (producto) =>
        numeroSeguro(producto.stockActual) <=
        numeroSeguro(producto.stockMinimo),
    ).length

    return {
      unidades,
      valor,
      bajos,
    }
  }, [productos])

  const abrirCrear = () => {
    setProductoEditando(null)
    setFormulario(formularioInicial())
    setModalAbierto(true)
  }

  const abrirEditar = (producto) => {
    setProductoEditando(producto)

    setFormulario({
      nombre: producto.nombre || '',
      sku: producto.sku || '',
      categoria: producto.categoria || 'Otros',
      costo: String(numeroSeguro(producto.costo)),
      precioVenta: String(numeroSeguro(producto.precioVenta)),
      stockActual: String(numeroSeguro(producto.stockActual)),
      stockMinimo: String(numeroSeguro(producto.stockMinimo)),
    })

    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (guardando) return

    setModalAbierto(false)
    setProductoEditando(null)
    setFormulario(formularioInicial())
  }

  const guardarProducto = async (event) => {
    event.preventDefault()
    setMensaje('')

    const costo = Number(formulario.costo)
    const precioVenta = Number(formulario.precioVenta)
    const stockActual = Number(formulario.stockActual)
    const stockMinimo = Number(formulario.stockMinimo)

    if (!formulario.nombre.trim()) {
      setMensaje('Debes indicar el nombre del producto.')
      return
    }

    if (
      [costo, precioVenta, stockActual, stockMinimo].some(
        (valor) => !Number.isFinite(valor) || valor < 0,
      )
    ) {
      setMensaje(
        'Costo, precio y stock deben ser números válidos mayores o iguales a cero.',
      )
      return
    }

    const datos = {
      nombre: formulario.nombre.trim(),
      sku: formulario.sku.trim(),
      categoria: formulario.categoria,
      costo,
      precioVenta,
      stockActual,
      stockMinimo,
      actualizadoPor: auth.currentUser?.email || null,
      updatedAt: serverTimestamp(),
    }

    try {
      setGuardando(true)

      if (productoEditando) {
        await updateDoc(
          doc(db, 'productos', productoEditando.id),
          datos,
        )

        setMensaje('Producto actualizado correctamente.')
      } else {
        await addDoc(collection(db, 'productos'), {
          ...datos,
          creadoPor: auth.currentUser?.email || null,
          createdAt: serverTimestamp(),
        })

        setMensaje('Producto agregado correctamente.')
      }

      cerrarModal()
    } catch (error) {
      console.error(error)
      setMensaje('No se pudo guardar el producto.')
    } finally {
      setGuardando(false)
    }
  }

  const ajustarStock = async (producto, cambio) => {
    const nuevoStock = Math.max(
      0,
      numeroSeguro(producto.stockActual) + cambio,
    )

    try {
      await updateDoc(doc(db, 'productos', producto.id), {
        stockActual: nuevoStock,
        actualizadoPor: auth.currentUser?.email || null,
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error(error)
      setMensaje('No se pudo actualizar el stock.')
    }
  }

  const eliminarProducto = async (producto) => {
    const confirmar = window.confirm(
      `Se eliminará el producto ${producto.nombre}.`,
    )

    if (!confirmar) return

    try {
      await deleteDoc(doc(db, 'productos', producto.id))
      setMensaje('Producto eliminado correctamente.')
    } catch (error) {
      console.error(error)
      setMensaje('No se pudo eliminar el producto.')
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Control de stock
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Inventario
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Productos y stock visibles para ambos usuarios de la PyME.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
        >
          <PackagePlus size={18} />
          Agregar producto
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
            Productos
          </p>

          <p className="mt-2 text-2xl font-bold dark:text-white">
            {productos.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Unidades disponibles
          </p>

          <p className="mt-2 text-2xl font-bold dark:text-white">
            {resumen.unidades}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Valor a costo
          </p>

          <p className="mt-2 text-2xl font-bold dark:text-white">
            {formatoCLP.format(resumen.valor)}
          </p>
        </div>
      </div>

      {resumen.bajos > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle size={18} />
          Hay {resumen.bajos} producto(s) con stock igual o inferior al mínimo.
        </div>
      )}

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
              placeholder="Buscar nombre, SKU o categoría"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {cargando ? (
          <div className="grid min-h-64 place-items-center text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando inventario...
            </div>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <Boxes className="mx-auto mb-3 text-slate-400" size={28} />

              <p className="font-semibold dark:text-white">
                No hay productos para mostrar
              </p>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Agrega el primer producto desde el botón superior.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Producto</th>
                    <th className="px-5 py-4">Categoría</th>
                    <th className="px-5 py-4">Costo</th>
                    <th className="px-5 py-4">Precio</th>
                    <th className="px-5 py-4">Stock</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productosFiltrados.map((producto) => {
                    const estado = estadoStock(producto)

                    return (
                      <tr
                        key={producto.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-medium dark:text-white">
                            {producto.nombre}
                          </p>

                          {producto.sku && (
                            <p className="mt-1 font-mono text-xs text-slate-500">
                              {producto.sku}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                          {producto.categoria}
                        </td>

                        <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                          {formatoCLP.format(numeroSeguro(producto.costo))}
                        </td>

                        <td className="px-5 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatoCLP.format(
                            numeroSeguro(producto.precioVenta),
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => ajustarStock(producto, -1)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Minus size={16} />
                            </button>

                            <span className="min-w-8 text-center font-bold dark:text-white">
                              {numeroSeguro(producto.stockActual)}
                            </span>

                            <button
                              type="button"
                              onClick={() => ajustarStock(producto, 1)}
                              className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estado.clase}`}
                          >
                            {estado.texto}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => abrirEditar(producto)}
                              className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => eliminarProducto(producto)}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {productosFiltrados.map((producto) => {
                const estado = estadoStock(producto)

                return (
                  <article key={producto.id} className="p-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold dark:text-white">
                          {producto.nombre}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {producto.categoria}
                        </p>
                      </div>

                      <span
                        className={`h-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estado.clase}`}
                      >
                        {estado.texto}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Stock
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => ajustarStock(producto, -1)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Minus size={17} />
                          </button>

                          <span className="min-w-8 text-center font-bold dark:text-white">
                            {numeroSeguro(producto.stockActual)}
                          </span>

                          <button
                            type="button"
                            onClick={() => ajustarStock(producto, 1)}
                            className="rounded-lg p-2 text-indigo-600 dark:text-indigo-400"
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEditar(producto)}
                          className="rounded-lg p-2 text-indigo-600 dark:text-indigo-400"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => eliminarProducto(producto)}
                          className="rounded-lg p-2 text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={guardarProducto}
            className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111827] sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-500">
                  {productoEditando ? 'Editar producto' : 'Nuevo producto'}
                </p>

                <h2 className="mt-1 text-xl font-bold dark:text-white">
                  {productoEditando
                    ? 'Actualizar producto'
                    : 'Agregar al inventario'}
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

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre del producto
                </span>

                <input
                  required
                  value={formulario.nombre}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      nombre: event.target.value,
                    })
                  }
                  placeholder="Ej: Cargador Xiaomi 67W"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  SKU opcional
                </span>

                <input
                  value={formulario.sku}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      sku: event.target.value,
                    })
                  }
                  placeholder="Ej: XIA-67W"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Categoría
                </span>

                <select
                  value={formulario.categoria}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      categoria: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {categorias.map((categoria) => (
                    <option key={categoria}>{categoria}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Costo CLP
                </span>

                <input
                  required
                  type="number"
                  min="0"
                  value={formulario.costo}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      costo: event.target.value,
                    })
                  }
                  placeholder="Ej: 7306"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Precio venta CLP
                </span>

                <input
                  required
                  type="number"
                  min="0"
                  value={formulario.precioVenta}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      precioVenta: event.target.value,
                    })
                  }
                  placeholder="Ej: 23000"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Stock actual
                </span>

                <input
                  required
                  type="number"
                  min="0"
                  value={formulario.stockActual}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      stockActual: event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Stock mínimo
                </span>

                <input
                  required
                  type="number"
                  min="0"
                  value={formulario.stockMinimo}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      stockMinimo: event.target.value,
                    })
                  }
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
                  : productoEditando
                    ? 'Actualizar producto'
                    : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}