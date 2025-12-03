import React, { useState } from 'react'
import { searchImages } from '../api/client'

const ImageSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const doSearch = async () => {
    setError(null)
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchImages(query)
      if (!data) throw new Error('Respuesta vacía del servidor')
      if (data.success === false) throw new Error(data.error || 'Búsqueda fallida')
      // data.results contiene objetos con { document, referenceId, score, ... }
      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Búsqueda de Imágenes (Multimodal)</h2>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Introduce URL de imagen, base64 o texto para búsqueda de imagenes"
        className="w-full border rounded p-2 mb-2"
      />

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={doSearch}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >{loading ? 'Buscando...' : 'Buscar Imágenes'}</button>
        <button onClick={() => { setQuery(''); setResults([]) }} className="px-3 py-2 border rounded">Limpiar</button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div>
        <h3 className="font-medium mb-2">Imágenes encontradas</h3>
        {results.length === 0 && <div className="text-sm text-gray-500">No hay imágenes</div>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {results.map((r, i) => (
            <div key={i} className="border rounded overflow-hidden bg-white">
              { (r.document?.url || r.url) ? (
                <img src={r.document?.url || r.url} alt={r.document?.titulo || 'image'} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-sm text-gray-500">Sin vista previa</div>
              )}
              <div className="p-2">
                <div className="text-sm text-gray-600">Score: {typeof r.score !== 'undefined' ? Number(r.score).toFixed(4) : '—'}</div>
                <div className="text-sm truncate">{r.document?.titulo || r.document?.title || r.referenceId || ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ImageSearch
