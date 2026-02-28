# Guía de Implementación - Patrones Correctos

Cómo agregar nuevas funcionalidades siguiendo los patrones arquitectónicos del proyecto.

## 1. Agregar Nuevo Tipo de Job

### Paso 1: Definir el Tipo (Layer: Schema)

**Archivo**: `src/jobs/types.js`

```javascript
export const JOB_TYPES = {
  SEND_EMAIL: 'send-email',
  PROCESS_DATA: 'process-data',
  SEND_SMS: 'send-sms',  // ← NUEVO
};
```

**Patrón**: Constante, reutilizable, centralizado.

### Paso 2: Validar Input (Layer: Schema)

**Archivo**: `src/jobs/schemas.js`

```javascript
[JOB_TYPES.SEND_SMS]: Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+\d{10,15}$/)  // +1234567890 format
    .required(),
  message: Joi.string()
    .max(160)  // SMS limit
    .required(),
  country: Joi.string()
    .length(2)  // ISO country code
    .required(),
}),
```

**Patrón**: Schema de Joi, validación completa, límites de negocio.

### Paso 3: Implementar Worker (Layer: Business Logic)

**Archivo**: `src/workers/smsWorker.js`

```javascript
import logger from '../logger/index.js';

/**
 * SMS processor with observability
 * @param {Job} job - BullMQ job object
 * @returns {Promise<object>} SMS sending result
 */
export const smsProcessor = async (job) => {
  const { phoneNumber, message, country } = job.data;

  logger.info(
    { jobId: job.id, phoneNumber, country },
    'Processing SMS job'
  );

  try {
    // Paso 1: Preparar
    job.progress(20);

    const formattedPhone = formatPhoneNumber(phoneNumber, country);
    logger.debug({ jobId: job.id, phone: formattedPhone }, 'Phone formatted');

    job.progress(40);

    // Paso 2: Validar servicio
    if (!isSMSProviderAvailable()) {
      throw new Error('SMS provider unavailable');
    }

    job.progress(60);

    // Paso 3: Enviar
    logger.debug({ jobId: job.id }, 'Sending SMS...');
    const result = await sendSMSViaProvider(formattedPhone, message);

    job.progress(80);

    // Paso 4: Guardar resultado
    await saveSMSLog(job.id, {
      phoneNumber: formattedPhone,
      message,
      messageId: result.id,
      timestamp: new Date().toISOString(),
    });

    job.progress(100);

    logger.info(
      { jobId: job.id, messageId: result.id },
      'SMS sent successfully'
    );

    return {
      success: true,
      phoneNumber: formattedPhone,
      messageId: result.id,
      cost: result.cost,
    };

  } catch (error) {
    logger.error(
      { jobId: job.id, phoneNumber, error: error.message },
      'SMS sending failed'
    );

    // Rethrow para que BullMQ reintentar
    throw error;
  }
};

// Funciones auxiliares (podrían ir en utils/)
function formatPhoneNumber(phone, country) {
  // Implementar lógica de formateo por país
  return phone;
}

function isSMSProviderAvailable() {
  // Verificar disponibilidad de provider
  return true;
}

async function sendSMSViaProvider(phone, message) {
  // Llamar API externa (Twilio, AWS SNS, etc)
  // Simular por ahora
  return {
    id: `sms_${Date.now()}`,
    cost: 0.01,
  };
}

async function saveSMSLog(jobId, data) {
  // Guardar en base de datos
  logger.debug({ jobId }, 'SMS log saved');
}
```

**Patrón**:
- Try/catch con logging detallado
- Progress reporting en cada etapa
- Funciones auxiliares reutilizables
- Documentación JSDoc

### Paso 4: Registrar Worker (Layer: Initialization)

**Archivo**: `src/index.js`

```javascript
import { registerWorker } from './queues/index.js';
import { smsProcessor } from './workers/smsWorker.js';
import JOB_TYPES from './jobs/types.js';

const initializeWorkers = async () => {
  logger.info('Initializing job workers...');

  try {
    registerWorker(JOB_TYPES.SEND_EMAIL, emailProcessor);
    registerWorker(JOB_TYPES.PROCESS_DATA, dataProcessor);
    registerWorker(JOB_TYPES.SEND_SMS, smsProcessor);  // ← NUEVO

    logger.info('All workers initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize workers');
    process.exit(1);
  }
};
```

**Patrón**: Una línea para registrar, centralizado.

### Paso 5: Crear Endpoint de API (Layer: API)

**Archivo**: `src/api/routes.js`

```javascript
/**
 * POST /jobs/send-sms
 * Submit SMS job to queue
 */
router.post('/jobs/send-sms', async (req, res) => {
  try {
    const { phoneNumber, message, country } = req.body;

    // Validación en layer API
    const validatedData = validateJobPayload(JOB_TYPES.SEND_SMS, {
      phoneNumber,
      message,
      country,
    });

    // Obtener/crear queue
    const queue = getQueue(JOB_TYPES.SEND_SMS);

    // Agregar job con options
    const job = await queue.add(
      JOB_TYPES.SEND_SMS,
      validatedData,
      {
        jobId: uuidv4(),
        // Opciones específicas para este tipo
        priority: 2,  // SMS menos urgente que email
        attempts: 2,  // Solo reintentar una vez
        backoff: {
          type: 'exponential',
          delay: 5000,  // Esperar más antes de reintentar
        },
      }
    );

    logger.info(
      { jobId: job.id, phoneNumber },
      'SMS job submitted'
    );

    // Response HTTP estándar
    res.status(202).json({
      success: true,
      jobId: job.id,
      status: 'queued',
      message: 'SMS job submitted successfully',
    });

  } catch (error) {
    logger.error(
      { error: error.message },
      'Failed to submit SMS job'
    );

    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});
```

**Patrón**:
- Validación Joi
- Contexto en logs
- Response estándar (202 Accepted)
- Error handling

## 2. Mejorar Worker Existente

### Ejemplo: Agregar Retry Logic Personalizado

**Archivo**: `src/workers/emailWorker.js`

```javascript
export const emailProcessor = async (job) => {
  const { email, subject, body } = job.data;

  try {
    job.progress(25);

    // Validar email
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    job.progress(50);

    // Enviar con retry interno
    const result = await sendEmailWithRetry(
      email,
      subject,
      body,
      { maxAttempts: 3, delay: 1000 }
    );

    job.progress(100);

    return { success: true, messageId: result.id };

  } catch (error) {
    // Solo reintentar para errores de red
    if (isNetworkError(error)) {
      logger.warn({ error: error.message }, 'Network error, will retry');
      throw error;
    }

    // Para errores de validación, no reintentar
    logger.error({ error: error.message }, 'Validation error, won\'t retry');
    return { success: false, error: error.message };
  }
};

function isNetworkError(error) {
  return error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';
}

async function sendEmailWithRetry(email, subject, body, options) {
  let lastError;

  for (let i = 0; i < options.maxAttempts; i++) {
    try {
      return await sendEmail(email, subject, body);
    } catch (error) {
      lastError = error;
      if (i < options.maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
    }
  }

  throw lastError;
}
```

**Patrón**: Diferenciación entre errores retryables y no retryables.

## 3. Agregar Middleware Personalizado

### Ejemplo: Autenticación de API

**Archivo**: `src/api/middleware.js`

```javascript
import logger from '../logger/index.js';

/**
 * API Key authentication
 */
export const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn(
      { path: req.path, ip: req.ip },
      'Unauthorized API access attempt'
    );

    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
    });
  }

  next();
};

/**
 * Rate limiting middleware
 */
export const rateLimit = (maxRequestsPerMinute = 60) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const key = `${ip}-${Math.floor(now / 60000)}`;

    if (!requests.has(key)) {
      requests.set(key, 0);
    }

    const count = requests.get(key) + 1;
    requests.set(key, count);

    if (count > maxRequestsPerMinute) {
      logger.warn({ ip, count }, 'Rate limit exceeded');
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
      });
    }

    next();
  };
};
```

**En routes.js:**

```javascript
import { authenticateAPI, rateLimit } from '../api/middleware.js';

// Aplicar middleware
router.use(rateLimit(100));  // 100 requests/minuto

// Endpoints protegidos
router.post('/jobs/send-sms', authenticateAPI, async (req, res) => {
  // ...
});
```

## 4. Agregar Herramientas de Utilidad

### Ejemplo: Helper para Batch Jobs

**Archivo**: `src/utils/batchJobs.js`

```javascript
import { getQueue } from '../queues/index.js';
import { validateJobPayload } from '../jobs/schemas.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger/index.js';

/**
 * Submit multiple jobs in batch
 * @param {string} jobType - Job type
 * @param {Array} dataArray - Array of job data
 * @param {Object} options - Queue options
 * @returns {Promise<Array>} Job IDs
 */
export const submitBatchJobs = async (jobType, dataArray, options = {}) => {
  const queue = getQueue(jobType);
  const jobIds = [];

  logger.info(
    { jobType, count: dataArray.length },
    'Starting batch submission'
  );

  try {
    for (const data of dataArray) {
      // Validar cada item
      const validatedData = validateJobPayload(jobType, data);

      const job = await queue.add(
        jobType,
        validatedData,
        {
          jobId: uuidv4(),
          ...options,
        }
      );

      jobIds.push(job.id);
    }

    logger.info(
      { jobType, count: jobIds.length },
      'Batch submission completed'
    );

    return jobIds;

  } catch (error) {
    logger.error(
      { jobType, error: error.message },
      'Batch submission failed'
    );
    throw error;
  }
};

/**
 * Wait for all jobs to complete
 * @param {Array} jobIds - Job IDs to wait for
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<Array>} Job results
 */
export const waitForAllJobs = async (jobIds, timeout = 300000) => {
  const startTime = Date.now();
  const results = new Map();

  while (Date.now() - startTime < timeout) {
    let allDone = true;

    for (const jobId of jobIds) {
      if (results.has(jobId)) continue;

      // Buscar job en todas las queues
      let job = null;
      for (const queue of Object.values(queues)) {
        job = await queue.getJob(jobId);
        if (job) break;
      }

      if (!job) continue;

      const state = await job.getState();

      if (state === 'completed') {
        results.set(jobId, { state: 'completed', result: job.returnvalue });
      } else if (state === 'failed') {
        results.set(jobId, { state: 'failed', error: job.failedReason });
      } else {
        allDone = false;
      }
    }

    if (allDone) {
      return Array.from(results.values());
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Not all jobs completed within ${timeout}ms`);
};
```

**En routes.js:**

```javascript
import { submitBatchJobs } from '../utils/batchJobs.js';

router.post('/jobs/batch/send-sms', async (req, res) => {
  try {
    const { phoneNumbers, message, country } = req.body;

    // Preparar array de datos
    const dataArray = phoneNumbers.map(phone => ({
      phoneNumber: phone,
      message,
      country,
    }));

    // Enviar batch
    const jobIds = await submitBatchJobs(JOB_TYPES.SEND_SMS, dataArray);

    res.status(202).json({
      success: true,
      jobIds,
      count: jobIds.length,
      message: `${jobIds.length} SMS jobs submitted`,
    });

  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

## 5. Agregar Monitoreo y Observabilidad

### Ejemplo: Custom Dashboard Endpoint

**Archivo**: `src/api/routes.js`

```javascript
/**
 * GET /dashboard/queue-health
 * Detailed queue health status
 */
router.get('/dashboard/queue-health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      queues: {},
      summary: {
        totalJobs: 0,
        activeJobs: 0,
        failedJobs: 0,
      },
    };

    for (const [jobType, queueName] of Object.entries(JOB_TYPES)) {
      const queue = getQueue(queueName);
      const counts = await queue.getJobCounts();
      const workers = await queue.getWorkerCount();

      health.queues[queueName] = {
        ...counts,
        workers,
        isHealthy: counts.failed < counts.completed * 0.1,  // <10% failure rate
      };

      // Update summary
      health.summary.totalJobs += (counts.waiting + counts.active);
      health.summary.activeJobs += counts.active;
      health.summary.failedJobs += counts.failed;
    }

    const statusCode = health.summary.failedJobs > 100 ? 503 : 200;

    res.status(statusCode).json(health);

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 📋 Checklist para Nueva Funcionalidad

- [ ] Tipo de job definido en `types.js`
- [ ] Schema de validación en `schemas.js`
- [ ] Worker implementado en `workers/`
- [ ] Worker registrado en `index.js`
- [ ] Endpoint de API en `routes.js`
- [ ] Logging en cada punto crítico
- [ ] Progress reporting en worker
- [ ] Error handling y retry logic
- [ ] Documentación actualizada

## ✅ Resultado

Siguiendo estos patrones obtienes:

- ✅ Código escalable y mantenible
- ✅ Fácil de agregar nuevas funcionalidades
- ✅ Observabilidad completa
- ✅ Manejo de errores robusto
- ✅ Arquitectura consistente
- ✅ Production-ready desde el inicio
