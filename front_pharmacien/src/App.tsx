import React from 'react'
import TextSearch from './components/TextSearch'
import ImageSearch from './components/ImageSearch'

const App: React.FC = () => {
  return (
    <div className="container">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">RAG MongoDB - Frontend</h1>
        <p className="text-sm text-gray-600">Interfaz simple para búsqueda de texto (RAG) y búsqueda multimodal de imágenes.</p>
      </header>

      <main className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <TextSearch />
        <ImageSearch />
      </main>
    </div>
  )
}

export default App
