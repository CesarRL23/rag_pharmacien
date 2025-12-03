import React, { useState } from 'react'
import { searchText } from '../api/client'

const TextSearch: React.FC = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const doSearch = async () => {
    setError(null)
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchText(query)
      // assume backend returns { success, results }
      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Búsqueda de Texto (RAG)</h2>
      <textarea
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Escribe tu consulta y presiona Ctrl+Enter o haz clic en Buscar Texto"
        className="w-full border rounded p-2 h-32 mb-2"
      />
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={doSearch}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? 'Buscando...' : 'Buscar Texto'}
        </button>
        <button
          onClick={() => { setQuery('') ; setResults([]) }}
          className="px-3 py-2 border rounded"
        >Limpiar</button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div>
        <h3 className="font-medium mb-2">Resultados</h3>
        {results.length === 0 && <div className="text-sm text-gray-500">No hay resultados</div>}
        <ul className="space-y-3">
          {results.map((r, i) => (
            <li key={i} className="p-3 border rounded bg-gray-50">
              <div className="text-sm text-gray-600">Score: {typeof r.score !== 'undefined' ? r.score.toFixed(4) : '—'}</div>
              <div className="mt-1 text-sm">{r.document?.title || r.chunk || r.referenceId || JSON.stringify(r)}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default TextSearch
