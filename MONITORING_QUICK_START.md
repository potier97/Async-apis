# Monitoreo Rápido - Colas y Logs

## 🎯 Tu Setup Preferido

**Servidor separado + Monitoreo profesional**

### Terminal 1: Redis
```bash
docker-compose -f docker-compose.dev.yml up
```

Verás: `* Ready to accept connections`

### Terminal 2: Servidor (Desarrollo)
```bash
npm run dev
```

Verás logs en vivo:
```
[13:45:27.123] INFO: Server started successfully
[13:45:27.124] INFO: All workers initialized successfully
```

### Terminal 3: Monitoreo de Colas

**Opción A: Ver stats cada 2 segundos**
```bash
watch -n 2 'curl -s http://localhost:3000/stats | jq ".queues"'
```

**Opción B: Script personalizado**
```bash
# Copia esto en terminal 3
while true; do
  clear
  echo "=== Estadísticas de Colas $(date '+%H:%M:%S') ==="
  curl -s http://localhost:3000/stats | jq '.queues'
  sleep 2
done
```

**Opción C: Con PM2 (más profesional)**
```bash
# En otra terminal (después que npm run dev esté corriendo)
pm2 monit
```

## 📊 Ver Colas en Vivo

### Enviar email job
```bash
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","subject":"Test","body":"Hello"}'
```

### Enviar data processing job
```bash
curl -X POST http://localhost:3000/jobs/process-data \
  -H "Content-Type: application/json" \
  -d '{"dataId":"550e8400-e29b-41d4-a716-446655440000","processType":"type1"}'
```

### Ver estado actual de colas
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
      "active": 1,      ← Procesando ahora
      "completed": 3,
      "failed": 0,
      "delayed": 0
    },
    "process-data": {
      "waiting": 2,     ← En espera
      "active": 0,
      "completed": 1,
      "failed": 0,
      "delayed": 0
    }
  }
}
```

### Ver detalles de un job
```bash
# Reemplaza {jobId} con el ID del job
curl http://localhost:3000/jobs/550e8400-e29b-41d4-a716-446655440000 | jq
```

## 📝 Logs en Terminal 2 (npm run dev)

Verás algo como:
```
[13:45:30.123] INFO: Processing email job
    jobId: "550e8400-e29b-41d4-a716-446655440000"
    email: "test@example.com"
    subject: "Test"
[13:45:31.456] INFO: Email sent successfully
    jobId: "550e8400-e29b-41d4-a716-446655440000"
    result: {
      "success": true,
      "email": "test@example.com",
      "messageId": "msg_1705332331456"
    }
```

## 🚨 Ver Errores

### Si un job falla, verás en logs:
```
[13:45:32.789] ERROR: Failed to send email
    jobId: "550e8400-e29b-41d4-a716-446655440000"
    email: "invalid-email"
    error: "Invalid email format"
```

### O buscar en PM2 logs:
```bash
pm2 logs bullmq-app | grep "error"
```

## ⭐ Resumen Rápido

| Acción | Comando |
|--------|---------|
| **Ver colas** | `curl http://localhost:3000/stats \| jq` |
| **Ver job** | `curl http://localhost:3000/jobs/{id}` |
| **Logs en tiempo real** | Terminal 2 con `npm run dev` |
| **Monitoreo profesional** | `pm2 monit` |
| **Enviar email job** | `curl -X POST http://localhost:3000/jobs/send-email -H "Content-Type: application/json" -d '{"email":"test@example.com","subject":"Test","body":"Hello"}'` |

## ✅ Checklist

- [ ] Redis corriendo en Terminal 1
- [ ] Servidor corriendo en Terminal 2
- [ ] Puedo ver logs de jobs en Terminal 2
- [ ] Puedo ver colas en `/stats`
- [ ] Puedo enviar jobs con curl
- [ ] Puedo ver estado de jobs con `/jobs/{id}`

---

**¡Listo para monitorear en desarrollo!** 🚀
