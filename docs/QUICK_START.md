# Quick Start - Sin Comandos Manuales

Una sola línea para tener todo funcionando.

## 🚀 Opción 1A: Docker Full (Todo automático)

### Requisito
- **Docker Desktop** instalado

### Iniciar

```bash
docker-compose up
```

- ✅ Redis automático
- ✅ App en http://localhost:3000
- ✅ Redis UI en http://localhost:8081

---

## 🚀 Opción 1B: Docker Dev (Solo Redis + Local App) - Recomendado para Debug

### Requisito
- **Docker Desktop**
- **Node.js** ≥18

### Terminal 1: Iniciar Redis + UI

```bash
docker-compose -f docker-compose.dev.yml up
```

Inicia solo:
- ✅ Redis
- ✅ Redis UI (http://localhost:8081)

### Terminal 2: Iniciar App Local (Simple)

```bash
npm run dev
```

App en http://localhost:3000 con **auto-reload** 🔄

### Terminal 2 Alternativo: Con PM2 (Profesional)

```bash
npm run dev:pm2
```

### Terminal 3: Monitoreo (con PM2)

```bash
npm run pm2:monit
```

Verás en tiempo real:
- ✅ CPU usado
- ✅ Memoria usada
- ✅ Logs en tiempo real
- ✅ Uptime del proceso

### Ventajas
- ✅ Debuguea código en tiempo real
- ✅ Hot reload con nodemon (o PM2 watch)
- ✅ Redis en Docker
- ✅ Fácil de editar código
- ✅ Monitoreo profesional con PM2

### Parar

```bash
# Terminal 1: Ctrl+C
docker-compose -f docker-compose.dev.yml down

# Terminal 2 (si usas PM2): Ctrl+C
# O: npm run pm2:stop
```

---

## 🚀 Opción 2: Local Puro (Sin Docker)

### Requisitos
- **Node.js** ≥18 (https://nodejs.org)
- **Redis** (https://redis.io/download)

### Paso 1: Instalar Dependencias

```bash
npm install
```

### Paso 2: Iniciar Redis

En **Terminal 1**:
```bash
redis-server
```

### Paso 3: Iniciar Aplicación

En **Terminal 2**:
```bash
npm run dev
```

**¡Listo!** Servidor en http://localhost:3000

---

## 📝 Primeros Pasos

### 1. Verificar que todo funciona

```bash
curl http://localhost:3000/health
```

Deberías ver:
```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. Enviar tu primer job

```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "subject": "¡Hola BullMQ!",
    "body": "Mi primer job"
  }'
```

Respuesta:
```json
{
  "success": true,
  "jobId": "abc123xyz",
  "status": "queued",
  "message": "Email job submitted successfully"
}
```

### 3. Verificar el estado del job

Reemplaza `abc123xyz` con tu jobId:

```bash
curl http://localhost:3000/jobs/abc123xyz
```

Verás:
```json
{
  "success": true,
  "jobId": "abc123xyz",
  "state": "completed",
  "progress": 100,
  "result": {
    "success": true,
    "email": "test@example.com",
    "messageId": "msg_1234567890"
  }
}
```

### 4. Ver estadísticas de colas

```bash
curl http://localhost:3000/stats
```

---

## 📊 Con Docker: Visualizar Redis

Docker Compose incluye Redis Commander automáticamente:

1. Abre http://localhost:8081
2. Verás todas las colas y jobs
3. Puedes inspeccionar datos directamente

---

## 📂 Estructura de Carpetas

```
bullmq/
├── src/                 ← Código fuente
├── docker-compose.yml   ← Configuración Docker
├── Dockerfile           ← Imagen de la app
├── .env                 ← Variables de entorno
├── package.json         ← Dependencias
└── README.md            ← Documentación
```

---

## 🔧 Comandos Importantes

### Con Docker

```bash
# Iniciar (primera vez instala, luego simplemente inicia)
docker-compose up

# Iniciar en background
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Detener
docker-compose down

# Reiniciar
docker-compose restart

# Reconstruir imagen
docker-compose up --build
```

### Sin Docker

```bash
# Instalar dependencias (una sola vez)
npm install

# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start

# Tests (opcional)
npm test

# Linter
npm run lint

# Monitor de colas
npm run queue:monitor
```

---

## 🛠️ Solucionar Problemas

### "Connection refused"

**Con Docker:**
```bash
# Asegúrate que Docker Desktop esté corriendo
# Luego:
docker-compose up

# Si aún falla:
docker-compose down
docker-compose up --build
```

**Sin Docker:**
```bash
# Asegúrate que Redis esté corriendo en Terminal 1:
redis-server

# Luego en Terminal 2:
npm run dev
```

### "Port already in use"

```bash
# Con Docker:
docker-compose down  # Detiene contenedores

# Sin Docker:
# Si puerto 3000 está en uso
PORT=3001 npm run dev

# Si Redis puerto 6379 está en uso
# Edita docker-compose.yml cambiar puerto
```

### "Module not found"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Con Docker:
docker-compose up --build
```

---

## 📚 Próximos Pasos

1. ✅ **Ahora funciona**: Envía más jobs y verifica estado
2. 📖 **Aprende**: Lee `README.md`
3. 🏗️ **Entiende la arquitectura**: Lee `ARCHITECTURE.md`
4. ➕ **Agrega features**: Crea nuevos tipos de jobs
5. 🚀 **Escala**: Ejecuta múltiples instancias

---

## 📋 Checklist

- [ ] Docker Desktop instalado (o Node + Redis)
- [ ] `docker-compose up` funciona (o `npm run dev`)
- [ ] `curl http://localhost:3000/health` devuelve 200
- [ ] Enviar un job y verificar estado
- [ ] Ver Redis UI en http://localhost:8081 (Docker)
- [ ] Leer `README.md` para entender la API

✅ Si todo funciona, ¡estás listo para desarrollar!

---

## 🆘 Soporte Rápido

| Problema | Solución |
|----------|----------|
| Docker no abre | Instalar Docker Desktop |
| Redis no inicia | `redis-server` en terminal |
| Port 3000 ocupado | `PORT=3001 npm run dev` |
| Node modules error | `npm install` o `docker-compose up --build` |
| Redis connection error | Esperar 5 segundos, Redis tarda en iniciar |

---

## 🎯 Hecho Fácil

**Opción Docker (recomendada):**
```bash
docker-compose up
```

**Opción Local:**
```bash
redis-server &  # Terminal 1
npm run dev     # Terminal 2
```

¡Ahora tenemos Redis y la app corriendo!
