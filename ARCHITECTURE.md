# Arquitectura y Patrones

Patrones arquitectónicos implementados en este proyecto para escalabilidad y mantenibilidad.

## 1. Patrón de Capas (Layered Architecture)

El proyecto está dividido en capas claras:

```
┌─────────────────────────────────────┐
│     API Layer (Express Routes)      │  HTTP endpoints
├─────────────────────────────────────┤
│    Business Logic Layer (Workers)   │  Job processing
├─────────────────────────────────────┤
│   Queue Management Layer (BullMQ)   │  Job queue
├─────────────────────────────────────┤
│    Data Layer (Redis)               │  Persistence
└─────────────────────────────────────┘
```

### Estructura de Carpetas

```
src/
├── api/          → Layer 1: HTTP Interface (Request/Response)
├── workers/      → Layer 2: Business Logic (Job Processing)
├── queues/       → Layer 3: Queue Orchestration (BullMQ)
├── config/       → Layer 4: Configuration & Connections
├── logger/       → Transversal: Logging throughout all layers
├── jobs/         → Schema layer: Data validation
└── utils/        → Helper utilities
```

**Beneficio**: Cada capa tiene responsabilidad clara, facilita testing y cambios.

---

## 2. Patrón de Inyección de Dependencias (DI)

Aunque JavaScript no requiere DI framework, usamos inversión de control:

### Centralización de Instancias

```javascript
// ❌ BAD - Crear instancias en cada lugar
// src/workers/emailWorker.js
const queue = new Queue('send-email');

// ❌ Difícil de testear, múltiples instancias
```

```javascript
// ✅ GOOD - Instancias centralizadas
// src/queues/index.js
export const getQueue = (queueName) => {
  // Una sola instancia por queue name
  if (queues.has(queueName)) {
    return queues.get(queueName);
  }
  // ...crear nueva
};

// src/api/routes.js
const queue = getQueue(JOB_TYPES.SEND_EMAIL);
```

**Beneficio**: Una instancia por recurso, fácil de mockear en tests, control centralizado.

---

## 3. Patrón Singleton para Recursos

Recursos únicos se crean una sola vez:

```javascript
// Logger singleton
export const logger = createLogger();

// Queues singleton
const queues = new Map(); // Una por tipo

// Workers singleton
const workers = new Map(); // Una por tipo
```

**Beneficio**: Evita múltiples conexiones Redis, mejor rendimiento.

---

## 4. Patrón Factory para Creación de Objetos

Las funciones factory encapsulan creación de objetos complejos:

```javascript
// src/queues/index.js
export const getQueue = (queueName) => {
  // Factory pattern: encapsula creación de Queue
  if (queues.has(queueName)) {
    return queues.get(queueName);
  }

  const queue = new Queue(queueName, {
    connection: config.redis,
    defaultJobOptions: {
      // ... configuración compleja
    },
  });

  queues.set(queueName, queue);
  return queue;
};
```

**Beneficio**: Centraliza lógica de creación, consistencia, facilita cambios.

---

## 5. Patrón de Validación en Capas

Validación en cada punto de entrada:

```
Request → API Layer → Validation → Business Layer → Execution
           (Joi)                    (Joi)

┌─────────────────────────────┐
│ POST /jobs/send-email       │
│ validateJobPayload()        │ ← Validación Layer 1
├─────────────────────────────┤
│ queue.add(validatedData)    │ ← Validación Layer 2
├─────────────────────────────┤
│ Worker processes job        │ ← Validation Layer 3
└─────────────────────────────┘
```

### Implementación

```javascript
// src/api/routes.js - Layer 1: API
const validatedData = validateJobPayload(JOB_TYPES.SEND_EMAIL, req.body);

// src/queues/index.js - Layer 2: Queue (optional)
const job = await queue.add(JOB_TYPES.SEND_EMAIL, validatedData);

// src/workers/emailWorker.js - Layer 3: Worker
const { email, subject } = job.data; // Ya validado
```

**Beneficio**: Defense in depth, errores capturados temprano.

---

## 6. Patrón de Observabilidad Transversal

Logging y monitoreo en todas las capas:

```
Request → Logger → Queue → Logger → Worker → Logger → Response

logger.info({ endpoint }, 'Request received')
logger.info({ queueName }, 'Queue created')
logger.info({ jobId }, 'Job queued')
logger.info({ jobId, progress }, 'Processing...')
logger.info({ jobId }, 'Job completed')
logger.error({ jobId, error }, 'Job failed')
```

### Estructura de Logging

```javascript
// Siempre incluir contexto
logger.info(
  { jobId: job.id, email: job.data.email, progress: job.progress() },
  'Email processing'
);

// En producción: JSON → agregador de logs
// En desarrollo: Pretty print → consola
```

**Beneficio**: Rastrabilidad completa, debugging simplificado.

---

## 7. Patrón Event-Driven para Workers

Workers escuchan eventos en lugar de polling:

```javascript
// ✅ GOOD - Event-driven
worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed');
});

worker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, error: err }, 'Job failed');
});

// ❌ BAD - Polling (ineficiente)
setInterval(async () => {
  const state = await job.getState();
  // ...
}, 1000);
```

**Beneficio**: Eficiente, reacciona inmediatamente, usa menos recursos.

---

## 8. Patrón de Configuración Centralizada

Una fuente única de verdad para configuración:

```javascript
// src/config/index.js
const config = {
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT),
  redis: getRedisConfig(),
  // ... etc
  validate: () => {
    // Validación de configuración
    if (!config.redis.host) throw new Error('...');
  }
};

config.validate(); // Falla rápido al startup
```

**Beneficio**: Errores de configuración se detectan al iniciar, no en runtime.

---

## 9. Patrón de Graceful Shutdown

Cierre ordenado de recursos:

```javascript
// src/index.js
process.on('SIGINT', async () => {
  logger.info('Shutting down...');

  // 1. Dejar de aceptar nuevos jobs
  // 2. Esperar que jobs activos terminen
  // 3. Cerrar workers
  // 4. Cerrar queues
  // 5. Cerrar conexiones

  await closeAll();
  process.exit(0);
});
```

**Beneficio**: No se pierden jobs, sin data corruption, transición limpia.

---

## 10. Patrón de Reintento con Backoff Exponencial

Reintentos inteligentes para fallos temporales:

```javascript
// src/queues/index.js
const queue = new Queue(queueName, {
  defaultJobOptions: {
    attempts: 3,  // Max 3 intentos
    backoff: {
      type: 'exponential',
      delay: 2000,  // Comienza con 2s
      // Próximos: 4s, 8s, ...
    },
  },
});
```

**Timeline de Reintentos:**
- Intento 1 (falla) → Espera 2 segundos
- Intento 2 (falla) → Espera 4 segundos
- Intento 3 (falla) → Job marcado como fallido

**Beneficio**: Maneja errores temporales (red, timeouts), evita sobrecarga.

---

## 11. Patrón Repository para Jobs

Abstracción de acceso a jobs:

```javascript
// src/utils/jobHelpers.js
export const getJobInfo = async (job) => {
  // Interfaz consistente para acceder a job info
  return {
    id: job.id,
    state: await job.getState(),
    progress: job.progress(),
    // ... etc
  };
};

export const waitForJobCompletion = async (job, timeout) => {
  // Oculta polling logic
  while (Date.now() - startTime < timeout) {
    const state = await job.getState();
    if (state === 'completed') return job.returnvalue;
    // ...
  }
};
```

**Beneficio**: Interfaz consistente, facilita cambios de implementación.

---

## 12. Patrón de Circuit Breaker (Implícito)

BullMQ incluye circuit breaker implícito:

```javascript
// Automático en BullMQ:
// - Detecta workers muertos
// - Redistribuye jobs
// - Reintenta automáticamente
// - Nunca pierde jobs

// No requiere código adicional
```

**Beneficio**: Resilencia automática, no se pierden jobs.

---

## Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT REQUEST                                          │
│ POST /jobs/send-email { email, subject, body }         │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ API LAYER (src/api/routes.js)                          │
│ • Recibir request                                       │
│ • Validar con Joi schema                               │
│ • Loguear con contexto                                 │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ QUEUE LAYER (src/queues/index.js)                      │
│ • Obtener/crear queue singleton                        │
│ • Agregar job con options (retries, timeout)          │
│ • Loguear job submission                               │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ REDIS (Persistent Queue Storage)                       │
│ • Almacenar job data                                   │
│ • Mantener job state                                   │
│ • Soportar reintentos                                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ WORKER LAYER (src/workers/emailWorker.js)              │
│ • Obtener job de queue                                 │
│ • Procesar: try/catch con logging                      │
│ • Reportar progreso: job.progress()                    │
│ • Retornar resultado o error                           │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ REDIS (Store Result)                                   │
│ • Guardar resultado o error                            │
│ • Actualizar estado (completed/failed)                 │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│ CLIENT POLLING (GET /jobs/:jobId)                      │
│ • Estado: completed/failed/active                      │
│ • Progreso: 0-100%                                     │
│ • Resultado o error                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Principios de Diseño Aplicados

### SOLID

- **S**ingle Responsibility: Cada archivo/función hace una cosa
- **O**pen/Closed: Abierto a extensión (agregar jobs), cerrado a modificación
- **L**iskov Substitution: Todos los workers siguen mismo interfaz
- **I**nterface Segregation: Interfaces mínimas y específicas
- **D**ependency Inversion: Dependencias inyectadas, no creadas localmente

### DRY (Don't Repeat Yourself)

- Validación centralizada en `src/jobs/schemas.js`
- Queue/worker management centralizado en `src/queues/index.js`
- Logger es singleton reutilizado

### KISS (Keep It Simple, Stupid)

- No hay patrones innecesarios
- Código es legible y directo
- Abstracciones solo donde hay duplicación

---

## Escalabilidad Horizontal

El proyecto soporta múltiples instancias:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Instance  │     │   Instance  │     │   Instance  │
│   #1 (App)  │     │   #2 (App)  │     │   #3 (App)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Redis     │
                    │  (Shared)   │
                    └─────────────┘
```

**Sin cambios de código:**
- Agregar más instancias del app
- Todas comparten la misma Redis
- Jobs se distribuyen automáticamente
- Balanceador de carga en frente

---

## Patrones de Error Handling

### Try/Catch en Workers

```javascript
export const processor = async (job) => {
  try {
    // Work
    return result;
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Failed');
    throw error; // BullMQ reintentar
  }
};
```

### Validación en API

```javascript
const validatedData = validateJobPayload(jobType, data);
// Si falla: Joi throws, catch en middleware
// Devuelve 400 al cliente
```

### Errores No Recuperables

```javascript
// Si datos son inválidos:
return { success: false, error: 'Invalid data' };
// No reintentar (ya validado)

// Si error de red:
throw error;
// BullMQ reintentar automáticamente
```

---

## Resumen

Este proyecto implementa patrones profesionales:

| Patrón | Propósito | Ubicación |
|--------|-----------|-----------|
| Layered | Separación de responsabilidades | Estructura `src/` |
| Singleton | Instancias únicas | `queues/`, `logger/` |
| Factory | Creación de objetos | `getQueue()`, `registerWorker()` |
| Validation | Entrada validada | `schemas.js`, `middleware.js` |
| Event-Driven | Reactividad | Workers en `queues/index.js` |
| Config | Configuración centralizada | `config/index.js` |
| Graceful Shutdown | Cierre ordenado | `index.js` |
| Backoff | Reintentos inteligentes | `defaultJobOptions` |
| Circuit Breaker | Resiliencia | BullMQ nativo |

**Resultado**: Código escalable, mantenible, y production-ready.
