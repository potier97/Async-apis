# Guía de Monitoreo - Colas y Logs

Cómo ver colas registradas y logs sin complicaciones.

## 🚀 Opción 1: Desarrollo Simple (Recomendado)

**Mejor para desarrollo local** - servidor en vivo, logs en terminal.

### Terminal 1: Iniciar Redis
```bash
docker-compose -f docker-compose.dev.yml up
```

Verás:
```
redis_1  | * Ready to accept connections
```

### Terminal 2: Iniciar Servidor
```bash
npm run dev
```

Verás logs en tiempo real:
```
[13:45:27.123] INFO: Server started successfully
[13:45:27.124] INFO: All workers initialized successfully
```

### Terminal 3: Enviar Jobs y Ver Colas

**Enviar email job:**
```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","subject":"Test","body":"Hello"}'
```

**Ver estadísticas de colas:**
```bash
curl http://localhost:3000/stats | jq
```

Respuesta:
```json
{
  "success": true,
  "timestamp": "2024-01-15T13:45:30.000Z",
  "queues": {
    "send-email": {
      "waiting": 0,
      "active": 0,
      "completed": 1,
      "failed": 0,
      "delayed": 0
    },
    "process-data": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0,
      "delayed": 0
    }
  }
}
```

**Ver logs del job:**
```bash
curl http://localhost:3000/jobs/{jobId}
```

**Ver salud del servidor:**
```bash
curl http://localhost:3000/health
```

## 🔍 Opción 2: Con PM2 (Solo Monitoreo)

**Mantén servidor en desarrollo, pero monitorea con PM2.**

### Terminal 1: Redis
```bash
docker-compose -f docker-compose.dev.yml up
```

### Terminal 2: Servidor (npm run dev)
```bash
npm run dev
```

### Terminal 3: PM2 Monitor (Sin gestionar el servidor)
```bash
pm2 monit
```

Verás dashboard en tiempo real con:
- CPU usado
- Memoria usada
- Logs en vivo
- Uptime

## 📊 Opción 3: Logs Detallados en Archivos

**Para depuración profunda - logs guardados en archivos.**

### Compilar primero
```bash
npm run build
```

### Iniciar con PM2 (gestiona el servidor)
```bash
pm2 start ecosystem.config.cjs
```

### Ver logs
```bash
# Todos los logs
pm2 logs

# Logs de la app específica
pm2 logs bullmq-app

# Últimas 100 líneas
pm2 logs bullmq-app --lines 100

# En tiempo real
pm2 logs bullmq-app --raw

# Buscar en logs
pm2 logs bullmq-app | grep "error"
```

### Logs guardados
- Archivo: `./logs/stdout.log`
- Errores: `./logs/stderr.log`

## 📋 Comandos Útiles para Ver Colas

### Ver todas las colas
```bash
curl http://localhost:3000/stats | jq '.queues'
```

### Ver job específico
```bash
curl http://localhost:3000/jobs/{jobId} | jq
```

### Ver estado del servidor
```bash
curl http://localhost:3000/health | jq
```

## 📈 Ejemplos de Monitoreo

### Monitoreo en vivo (sin PM2)
```bash
# Terminal 1
docker-compose -f docker-compose.dev.yml up

# Terminal 2
npm run dev

# Terminal 3 - ejecutar esto en loop
watch -n 2 'curl -s http://localhost:3000/stats | jq ".queues"'
```

Verá actualización cada 2 segundos:
```
Every 2.0s: curl -s http://localhost:3000/stats | jq ".queues"

{
  "send-email": {
    "waiting": 0,
    "active": 0,
    "completed": 3,
    "failed": 0,
    "delayed": 0
  },
  "process-data": {
    "waiting": 1,
    "active": 1,
    "completed": 0,
    "failed": 0,
    "delayed": 0
  }
}
```

### Monitoreo con PM2 (gestiona servidor)
```bash
# Terminal 1
docker-compose -f docker-compose.dev.yml up

# Terminal 2
npm run dev:pm2

# Terminal 3
pm2 monit
```

Dashboard muestra en tiempo real:
```
┌─ Process ─────────────────────────────┬─ Memory ─┬─ CPU ─┐
│ bullmq-app                            │ 45.2 MB │ 0.5%  │
└───────────────────────────────────────┴─────────┴───────┘
```

## 🎯 Recomendación Final

**Para desarrollo:**
```bash
# Terminal 1: Redis
docker-compose -f docker-compose.dev.yml up

# Terminal 2: Servidor con auto-reload
npm run dev

# Terminal 3: Monitorear colas manualmente
curl http://localhost:3000/stats
```

**Para producción:**
```bash
# Terminal 1: Redis
docker run -p 6379:6379 redis:latest

# Terminal 2: Servidor con PM2
npm run dev:pm2

# Terminal 3: Monitoreo en tiempo real
pm2 monit
```

## 🔧 Ver Colas en Tiempo Real (Bash Script)

Crea archivo `monitor.sh`:
```bash
#!/bin/bash

echo "🔄 BullMQ Queue Monitor"
while true; do
  clear
  echo "=== Estadísticas de Colas ==="
  echo "Hora: $(date '+%H:%M:%S')"
  echo ""
  curl -s http://localhost:3000/stats | jq '.queues | to_entries[] | {queue: .key, stats: .value}' || echo "❌ Servidor no disponible"
  sleep 2
done
```

Ejecutar:
```bash
chmod +x monitor.sh
./monitor.sh
```

## 📝 Logs Importantes

### Cuando se inicia un job
```
[13:45:30.123] INFO: Email job submitted
    jobId: "550e8400-e29b-41d4-a716-446655440000"
    email: "test@example.com"
```

### Cuando se completa
```
[13:45:31.456] INFO: Email sent successfully
    jobId: "550e8400-e29b-41d4-a716-446655440000"
    result: {
      "success": true,
      "messageId": "msg_1234567890"
    }
```

### Cuando falla
```
[13:45:32.789] ERROR: Failed to send email
    jobId: "550e8400-e29b-41d4-a716-446655440000"
    email: "invalid-email"
    error: "Invalid email format"
```

## ✅ Checklist de Monitoreo

- [ ] ¿Puedo ver logs en Terminal 2?
- [ ] ¿Puedo ver stats en `http://localhost:3000/stats`?
- [ ] ¿Puedo ver estado del job en `http://localhost:3000/jobs/{jobId}`?
- [ ] ¿Puedo enviar jobs y ver que se procesan?
- [ ] ¿Puedo ver colas vacías/llenas en `/stats`?

---

**Usa lo que funcione mejor para tu flujo de desarrollo.** 🚀
