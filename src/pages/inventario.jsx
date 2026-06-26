import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import {
  AlertTriangle,
  Boxes,
  CircleAlert,
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
  'Celulares',
  'Accesorios',
  'Servicios',
  'Otros',
]

function crearFormularioInicial() {
  return {
    nombre: '',
    sku: '',
    categoria: 'Otros',
    costo: '',
    precioVenta: '',
    stockActual: '0',
    stockMinimo: '0',
    activo: true,
  }
}

function obtenerStock(producto) {
  return Number(producto.stockActual) || 0
}

function obtenerStockMinimo(producto) {
  return Number(producto.stockMinimo) || 0
}

function estadoStock(producto) {
  const stock = obtenerStock(producto)
  const minimo = obtenerStockMinimo(producto)

  if (producto.activo === false) {
    return {
      texto: 'Inactivo',
      clase:
        'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    }
  }

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
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [mensaje, setMensaje] = useState(null)
  const [formulario, setFormulario] = useState(crearFormularioInicial)

  useEffect(() => {
    const empresaId = localStorage.getItem('empresaId')

    if (!empresaId) {
      setMensaje({
        tipo: 'error',
        texto: 'No se encontró una empresa asociada a esta sesión.',
      })
      setCargando(false)
      return undefined
    }

    const consulta = query(
      collection(db, 'productos'),
      where('empresaId', '==', empresaId),
    )

    const cancelar = onSnapshot(
      consulta,
      (snapshot) => {
        const listaProductos = snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
            stockActual: Number(documento.data().stockActual) || 0,
            stockMinimo: Number(documento.data().stockMinimo) || 0,
            costo: Number(documento.data().costo) || 0,
            precioVenta: Number(documento.data().precioVenta) || 0,
            activo: documento.data().activo !== false,
          }))
          .sort((a, b) =>
            String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'),
          )

        setProductos(listaProductos)
        setCargando(false)
      },
      (error) => {
        console.error('Error al cargar inventario:', error)

        setMensaje({
          tipo: 'error',
          texto:
            'No fue posible cargar el inventario. Revisa las reglas de Firestore.',
        })

        setCargando(false)
      },
    )

    return cancelar
  }, [])

  const productosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()

    return productos.filter((producto) => {
      const stock = obtenerStock(producto)
      const minimo = obtenerStockMinimo(producto)

      let cumpleFiltro = true

      if (filtro === 'disponibles') {
        cumpleFiltro = producto.activo !== false && stock > minimo
      }

      if (filtro === 'bajo') {
        cumpleFiltro =
          producto.activo !== false && stock > 0 && stock <= minimo
      }

      if (filtro === 'sin-stock') {
        cumpleFiltro = producto.activo !== false && stock <= 0
      }

      if (filtro === 'inactivos') {
        cumpleFiltro = producto.activo === false
      }

      if (!cumpleFiltro) return false

      if (!termino) return true

      const datosBuscables = [
        producto.nombre,
        producto.sku,
        producto.categoria,
      ]

      return datosBuscables
        .filter(Boolean)
        .some((dato) => String(dato).toLowerCase().includes(termino))
    })
  }, [busqueda, filtro, productos])

  const resumen = useMemo(() => {
    const productosActivos = productos.filter(
      (producto) => producto.activo !== false,
    )

    const unidadesTotales = productosActivos.reduce(
      (acumulado, producto) => acumulado + obtenerStock(producto),
      0,
    )

    const productosBajoStock = productosActivos.filter((producto) => {
      const stock = obtenerStock(producto)
      const minimo = obtenerStockMinimo(producto)

      return stock > 0 && stock <= minimo
    }).length

    const productosSinStock = productosActivos.filter(
      (producto) => obtenerStock(producto) <= 0,
    ).length

    const valorInventario = productosActivos.reduce(
      (acumulado, producto) =>
        acumulado + obtenerStock(producto) * (Number(producto.costo) || 0),
      0,
    )

    return {
      productosActivos: productosActivos.length,
      unidadesTotales,
      productosBajoStock,
      productosSinStock,
      valorInventario,
    }
  }, [productos])

  const abrirModalCrear = () => {
    setFormulario(crearFormularioInicial())
    setProductoEditando(null)
    setMensaje(null)
    setModalAbierto(true)
  }

  const abrirModalEditar = (producto) => {
    setFormulario({
      nombre: producto.nombre || '',
      sku: producto.sku || '',
      categoria: producto.categoria || 'Otros',
      costo: String(producto.costo || ''),
      precioVenta: String(producto.precioVenta || ''),
      stockActual: String(obtenerStock(producto)),
      stockMinimo: String(obtenerStockMinimo(producto)),
      activo: producto.activo !== false,
    })

    setProductoEditando(producto)
    setMensaje(null)
    setModalAbierto(true)
  }

  const cerrarModal = () => {
    if (guardando) return

    setModalAbierto(false)
    setProductoEditando(null)
    setFormulario(crearFormularioInicial())
  }

  const guardarProducto = async (event) => {
    event.preventDefault()
    setMensaje(null)

    const empresaId = localStorage.getItem('empresaId')

    const costo = Number(formulario.costo)
    const precioVenta = Number(formulario.precioVenta)
    const stockActual = Number(formulario.stockActual)
    const stockMinimo = Number(formulario.stockMinimo)

    if (!empresaId) {
      setMensaje({
        tipo: 'error',
        texto: 'La sesión no tiene una empresa válida.',
      })
      return
    }

    if (!formulario.nombre.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Debes indicar el nombre del producto.',
      })
      return
    }

    if (
      !Number.isFinite(costo) ||
      !Number.isFinite(precioVenta) ||
      costo < 0 ||
      precioVenta < 0
    ) {
      setMensaje({
        tipo: 'error',
        texto: 'El costo y el precio deben ser valores válidos.',
      })
      return
    }

    if (
      !Number.isInteger(stockActual) ||
      !Number.isInteger(stockMinimo) ||
      stockActual < 0 ||
      stockMinimo < 0
    ) {
      setMensaje({
        tipo: 'error',
        texto: 'El stock actual y mínimo deben ser números enteros positivos.',
      })
      return
    }

    try {
      setGuardando(true)

      const datosProducto = {
        nombre: formulario.nombre.trim(),
        sku: formulario.sku.trim() || null,
        categoria: formulario.categoria,
        costo,
        precioVenta,
        stockActual,
        stockMinimo,
        activo: formulario.activo,
      }

      if (productoEditando) {
        await updateDoc(doc(db, 'productos', productoEditando.id), {
          ...datosProducto,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.uid || null,
        })

        setMensaje({
          tipo: 'ok',
          texto: 'Producto actualizado correctamente.',
        })
      } else {
        await addDoc(collection(db, 'productos'), {
          empresaId,
          ...datosProducto,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          creadoPor: auth.currentUser?.uid || null,
        })

        setMensaje({
          tipo: 'ok',
          texto: 'Producto agregado al inventario.',
        })
      }

      setModalAbierto(false)
      setProductoEditando(null)
      setFormulario(crearFormularioInicial())
    } catch (error) {
      console.error('Error al guardar producto:', error)

      setMensaje({
        tipo: 'error',
        texto:
          'No se pudo guardar el producto. Revisa la conexión y permisos de Firestore.',
      })
    } finally {
      setGuardando(false)
    }
  }

  const ajustarStock = async (producto, ajuste) => {
    const stockActual = obtenerStock(producto)
    const nuevoStock = stockActual + ajuste

    if (nuevoStock < 0) {
      setMensaje({
        tipo: 'error',
        texto: 'El stock no puede quedar bajo cero.',
      })
      return
    }

    try {
      await updateDoc(doc(db, 'productos', producto.id), {
        stockActual: nuevoStock,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid || null,
      })

      setMensaje({
        tipo: 'ok',
        texto:
          ajuste > 0
            ? 'Se agregó una unidad al stock.'
            : 'Se descontó una unidad del stock.',
      })
    } catch (error) {
      console.error('Error ajustando stock:', error)

      setMensaje({
        tipo: 'error',
        texto: 'No fue posible actualizar el stock.',
      })
    }
  }

  const eliminarProducto = async (producto) => {
    const confirmar = window.confirm(
      `Se eliminará "${producto.nombre}". Esta acción no se puede deshacer.`,
    )

    if (!confirmar) return

    try {
      await deleteDoc(doc(db, 'productos', producto.id))

      setMensaje({
        tipo: 'ok',
        texto: 'Producto eliminado correctamente.',
      })
    } catch (error) {
      console.error('Error al eliminar producto:', error)

      setMensaje({
        tipo: 'error',
        texto: 'No fue posible eliminar el producto.',
      })
    }
  }

  return (
    <section className="mx-auto max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-500">
            Control de productos
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Inventario
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Administra productos, precios, costos y niveles de stock.
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalCrear}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
        >
          <PackagePlus size={18} />
          Agregar producto
        </button>
      </div>

      {mensaje && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            mensaje.tipo === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300'
          }`}
        >
          <CircleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Productos activos
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {resumen.productosActivos}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Unidades disponibles
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {resumen.unidadesTotales}
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Alertas de stock
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {resumen.productosBajoStock + resumen.productosSinStock}
          </p>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {resumen.productosBajoStock} bajos · {resumen.productosSinStock} sin stock
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Valor del inventario
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {formatoCLP.format(resumen.valorInventario)}
          </p>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Calculado según costo unitario
          </p>
        </article>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0f1524]">
        <div className="grid gap-4 border-b border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar por nombre, SKU o categoría"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
              />
            </div>

            <select
              value={filtro}
              onChange={(event) => setFiltro(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            >
              <option value="todos">Todos los productos</option>
              <option value="disponibles">Disponibles</option>
              <option value="bajo">Stock bajo</option>
              <option value="sin-stock">Sin stock</option>
              <option value="inactivos">Inactivos</option>
            </select>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {productosFiltrados.length}{' '}
            {productosFiltrados.length === 1 ? 'producto' : 'productos'}
          </p>
        </div>

        {cargando ? (
          <div className="grid min-h-72 place-items-center p-8 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-3">
              <LoaderCircle size={20} className="animate-spin" />
              Cargando inventario...
            </div>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Boxes size={22} />
              </div>

              <h2 className="font-semibold text-slate-900 dark:text-white">
                No hay productos para mostrar
              </h2>

              <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Agrega productos para comenzar a controlar tu stock.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Producto</th>
                    <th className="px-5 py-4 font-semibold">SKU</th>
                    <th className="px-5 py-4 font-semibold">Categoría</th>
                    <th className="px-5 py-4 text-right font-semibold">Costo</th>
                    <th className="px-5 py-4 text-right font-semibold">Precio</th>
                    <th className="px-5 py-4 text-center font-semibold">Stock</th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                    <th className="px-5 py-4 text-right font-semibold">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productosFiltrados.map((producto) => {
                    const estado = estadoStock(producto)

                    return (
                      <tr
                        key={producto.id}
                        className="transition hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {producto.nombre}
                          </p>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Mínimo: {obtenerStockMinimo(producto)} unidades
                          </p>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                          {producto.sku || '—'}
                        </td>

                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          {producto.categoria}
                        </td>

                        <td className="px-5 py-4 text-right text-slate-600 dark:text-slate-300">
                          {formatoCLP.format(producto.costo)}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatoCLP.format(producto.precioVenta)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => ajustarStock(producto, -1)}
                              disabled={obtenerStock(producto) <= 0}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Minus size={15} />
                            </button>

                            <span className="min-w-8 text-center font-bold text-slate-900 dark:text-white">
                              {obtenerStock(producto)}
                            </span>

                            <button
                              type="button"
                              onClick={() => ajustarStock(producto, 1)}
                              className="grid h-8 w-8 place-items-center rounded-lg border border-indigo-200 text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-900/70 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estado.clase}`}
                          >
                            {estado.texto}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalEditar(producto)}
                              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                            >
                              <Pencil size={16} />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => eliminarProducto(producto)}
                              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                              <Trash2 size={16} />
                              Eliminar
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
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">
                          {producto.nombre}
                        </p>

                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {producto.categoria} · SKU: {producto.sku || '—'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${estado.clase}`}
                      >
                        {estado.texto}
                      </span>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Precio
                        </p>

                        <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatoCLP.format(producto.precioVenta)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Costo
                        </p>

                        <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">
                          {formatoCLP.format(producto.costo)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Stock actual
                        </p>

                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {obtenerStock(producto)} unidades
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => ajustarStock(producto, -1)}
                          disabled={obtenerStock(producto) <= 0}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                        >
                          <Minus size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => ajustarStock(producto, 1)}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-indigo-200 text-indigo-600 dark:border-indigo-900/70 dark:text-indigo-400"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-4 text-sm">
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(producto)}
                        className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarProducto(producto)}
                        className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400"
                      >
                        <Trash2 size={15} />
                        Eliminar
                      </button>
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
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#111827] sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-indigo-500">
                  {productoEditando ? 'Editar producto' : 'Nuevo producto'}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  {productoEditando
                    ? 'Actualizar inventario'
                    : 'Agregar al inventario'}
                </h2>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    SKU o código interno
                  </span>

                  <input
                    value={formulario.sku}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        sku: event.target.value,
                      })
                    }
                    placeholder="Ej: XIA-67W-01"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Costo unitario
                  </span>

                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    value={formulario.costo}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        costo: event.target.value,
                      })
                    }
                    placeholder="Ej: 7306"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Precio de venta
                  </span>

                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    value={formulario.precioVenta}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        precioVenta: event.target.value,
                      })
                    }
                    placeholder="Ej: 23000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Stock actual
                  </span>

                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    value={formulario.stockActual}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        stockActual: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                    Stock mínimo
                  </span>

                  <input
                    required
                    min="0"
                    step="1"
                    type="number"
                    value={formulario.stockMinimo}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        stockMinimo: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={formulario.activo}
                  onChange={(event) =>
                    setFormulario({
                      ...formulario,
                      activo: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-indigo-600"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Producto activo
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Los productos inactivos se conservan, pero no se consideran disponibles.
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
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