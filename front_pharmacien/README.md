# Front Pharmacien (Frontend)

Frontend minimal en React + TypeScript (Vite) para el sistema `rag-mongodb-system`.

Características
- Dos secciones: Búsqueda de Texto (RAG) y Búsqueda de Imágenes (Multimodal).
- TailwindCSS para estilos rápidos.
- Proxy configurado para `http://localhost:3000/api`.

Instalación y ejecución

1. Abrir la carpeta `front_pharmacien`:

```powershell
cd front_pharmacien
npm install
npm run dev
```

2. Abrir `http://localhost:5173` en el navegador.

Endpoints asumidos por defecto
- `POST /api/v1/search/text` — body `{ "query": "..." }`, devuelve `{ success, results }`.
- `POST /api/v1/search/images` — body `{ "query": "..." }`, devuelve `{ success, results }` donde cada resultado puede tener `url`, `score`, `document`.

Conectar al backend
El `vite.config.ts` configura proxy para rutas que comiencen en `/api` apuntando al backend local `http://localhost:3000`.

Personalización
- Puedes adaptar la URL de los endpoints en `src/api/client.ts`.
