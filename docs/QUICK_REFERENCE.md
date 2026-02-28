# Quick Reference - Resumen Rápido

Todo lo que necesitas saber en una sola página.

## 🚀 Iniciar Proyecto

```bash
# Opción 1: Docker (recomendado)
docker-compose up

# Opción 2: Local
redis-server &          # Terminal 1
npm run dev             # Terminal 2
```

**Servidor en**: http://localhost:3000

---

## 📡 Endpoints API

### Enviar Email

```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Hello",
    "body": "Message"
  }'

# Response: { "jobId": "abc123", "status": "queued" }
```

### Procesar Datos

```bash
curl -X POST http://localhost:3000/jobs/process-data \
  -H "Content-Type: application/json" \
  -d '{
    "dataId": "550e8400-e29b-41d4-a716-446655440000",
    "processType": "type1"
  }'
```

### Ver Estado del Job

```bash
curl http://localhost:3000/jobs/abc123

# Response: { "state": "completed", "progress": 100, "result": {...} }
```

### Estadísticas

```bash
curl http://localhost:3000/stats

# Response: { "queues": { "send-email": {...}, ... } }
```

### Health Check

```bash
curl http://localhost:3000/health

# Response: { "status": "ok" }
```

---

## 📝 Agregar Nuevo Job Type (5 pasos)

### 1. Tipo

```javascript
// src/jobs/types.js
export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  SEND_SMS: 'send-sms',  // ← NUEVO
};
```

### 2. Schema

```javascript
// src/jobs/schemas.js
[JOB_TYPES.SEND_SMS]: Joi.object({
  phoneNumber: Joi.string().required(),
  message: Joi.string().required(),
}),
```

### 3. Worker

```javascript
// src/workers/smsWorker.js
export const smsProcessor = async (job) => {
  const { phoneNumber, message } = job.data;
  job.progress(25);
  // Tu lógica aquí
  job.progress(100);
  return { success: true };
};
```

### 4. Registrar

```javascript
// src/index.js
registerWorker(JOB_TYPES.SEND_SMS, smsProcessor);
```

### 5. API Route

```javascript
// src/api/routes.js
router.post('/jobs/send-sms', async (req, res) => {
  const validatedData = validateJobPayload(JOB_TYPES.SEND_SMS, req.body);
  const queue = getQueue(JOB_TYPES.SEND_SMS);
  const job = await queue.add(JOB_TYPES.SEND_SMS, validatedData);
  res.status(202).json({ success: true, jobId: job.id });
});
```

---

## 🏗️ Estructura de Carpetas

```
src/
├── api/          → HTTP endpoints y middleware
├── config/       → Configuración centralizada
├── jobs/         → Tipos y schemas de validación
├── queues/       → Gestión de colas y workers
├── workers/      → Procesadores de jobs
├── logger/       → Logger centralizado
├── utils/        → Funciones auxiliares
└── __tests__/    → Tests (opcional)
```

---

## 🔧 Comandos Principales

```bash
# Desarrollo
npm run dev              # Con auto-reload
npm run queue:monitor    # Monitor en tiempo real

# Producción
npm start

# Testing (opcional)
npm test
npm test -- --watch
npm test -- --coverage

# Linting
npm run lint
npm run lint --fix
```

---

## 📊 Job States (Ciclo de Vida)

```
┌─────────┐
│ waiting │ ← Job en cola esperando
└────┬────┘
     │
     ▼
┌─────────┐
│ active  │ ← Worker procesando
└────┬────┘
     │
     ├─→ completed ✅
     │
     ├─→ failed ❌
     │   ├─ Reintenta si intentos < max
     │   └─ Falla permanentemente
     │
     └─→ delayed ⏱️ ← Scheduled para después
```

---

## 🔄 Validación en Capas

```
Request HTTP
    ↓
API Route (Layer 1)
  validateJobPayload() → Joi schema
    ↓ (validado)
Queue (Layer 2)
  queue.add() → Job en Redis
    ↓
Worker (Layer 3)
  job.data → Ya validado
```

---

## 📋 Logging Correcto

```javascript
// ✅ GOOD - Con contexto
logger.info({ jobId: job.id, email }, 'Email sent');

// ❌ BAD - Sin contexto
logger.info('Email sent');

// ✅ Errores
logger.error({ jobId: job.id, error: err.message }, 'Failed');
```

---

## 🔐 Variables de Entorno

```bash
# .env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
CONCURRENCY=5
JOB_TIMEOUT=300000
```

---

## 🎯 Job Progress

```javascript
job.progress(0);    // Inicio
job.progress(25);   // 25%
job.progress(50);   // Mitad
job.progress(75);   // Casi
job.progress(100);  // Completado
```

Cliente puede ver progreso vía:
```bash
curl http://localhost:3000/jobs/{jobId}
# Retorna: { "progress": 75 }
```

---

## ⚡ Patrones Clave

| Patrón | Archivo | Propósito |
|--------|---------|-----------|
| **Singleton** | `queues/index.js` | Una instancia por queue |
| **Factory** | `getQueue()` | Crear/obtener queues |
| **Validación** | `schemas.js` | Joi schemas |
| **Event-Driven** | `workers.on()` | Escuchar eventos |
| **Layered** | `src/` estructura | Separación clara |
| **Centralized** | `config/` | Una fuente de verdad |

---

## 🚨 Error Handling

```javascript
try {
  // Trabajo
  return result;
} catch (error) {
  logger.error({ error: error.message }, 'Failed');
  throw error;  // BullMQ reintentar
}
```

**Automático:**
- 3 reintentos
- Exponential backoff
- No se pierden jobs
- Stored en Redis

---

## 📈 Escalabilidad

```bash
# Instance 1
docker-compose up

# Instance 2 (mismo .env, mismo Redis)
docker-compose up -p bullmq2

# Instance 3
docker-compose up -p bullmq3

# Todos comparten Redis → Jobs distribuidos
```

---

## 🐛 Debugging

```bash
# 1. Ver logs con más detalle
LOG_LEVEL=debug npm run dev

# 2. Monitor de colas en tiempo real
npm run queue:monitor

# 3. Status de un job específico
curl http://localhost:3000/jobs/{jobId}

# 4. Ver queue stats
curl http://localhost:3000/stats

# 5. Redis UI (Docker)
http://localhost:8081
```

---

## 📚 Documentación Completa

| Archivo | Contenido |
|---------|-----------|
| **QUICK_START.md** | Cómo iniciar (esta guía) |
| **README.md** | Documentación completa |
| **ARCHITECTURE.md** | Patrones y diseño |
| **IMPLEMENTATION_GUIDE.md** | Cómo agregar features |
| **EXAMPLES.md** | 10 ejemplos de código |
| **SETUP.md** | Instalación detallada |
| **LEARNING_PATH.md** | Ruta de aprendizaje |
| **agents.md** | Estándares de código |

---

## ✅ Checklist: Nuevo Job Type

- [ ] Agregado a `types.js`
- [ ] Schema en `schemas.js`
- [ ] Worker en `workers/`
- [ ] Registrado en `index.js`
- [ ] Route en `routes.js`
- [ ] Logging en cada paso
- [ ] Progress reporting
- [ ] Error handling

---

## 🆘 Problemas Comunes

| Problema | Solución |
|----------|----------|
| Redis connection error | `docker-compose up` o `redis-server` |
| Port 3000 en uso | `PORT=3001 npm run dev` |
| Module not found | `npm install` o `docker-compose up --build` |
| Job no procesa | Verificar `npm run queue:monitor` |
| Logs no aparecen | `LOG_LEVEL=debug npm run dev` |

---

## 🎓 Próximos Pasos

1. **Ahora**: `docker-compose up` y prueba los endpoints
2. **Aprende**: Lee `ARCHITECTURE.md`
3. **Implementa**: Sigue `IMPLEMENTATION_GUIDE.md`
4. **Profundiza**: Agrega tu propio job type
5. **Escala**: Lee sobre patrones avanzados

---

## 📞 Referencia Rápida de Código

```javascript
// Importar lo que necesitas
import { getQueue, registerWorker } from './queues/index.js';
import logger from './logger/index.js';
import JOB_TYPES from './jobs/types.js';
import { validateJobPayload } from './jobs/schemas.js';

// Obtener queue
const queue = getQueue(JOB_TYPES.SEND_EMAIL);

// Agregar job
const job = await queue.add(
  JOB_TYPES.SEND_EMAIL,
  { email: '...', subject: '...', body: '...' },
  { jobId: uuid(), attempts: 3 }
);

// En worker
export const processor = async (job) => {
  try {
    job.progress(50);
    const result = await doWork(job.data);
    return result;
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Failed');
    throw error;
  }
};

// Registrar worker
registerWorker(JOB_TYPES.SEND_EMAIL, processor);

// En API route
router.post('/jobs/send-email', async (req, res) => {
  try {
    const data = validateJobPayload(JOB_TYPES.SEND_EMAIL, req.body);
    const queue = getQueue(JOB_TYPES.SEND_EMAIL);
    const job = await queue.add(JOB_TYPES.SEND_EMAIL, data);
    res.status(202).json({ success: true, jobId: job.id });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

---

**¡Listo para empezar? Ejecuta**: `docker-compose up`
