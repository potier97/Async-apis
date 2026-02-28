# PM2 Guide - Professional Queue Monitoring

**PM2** es un process manager para Node.js que proporciona monitoreo profesional en tiempo real. Reemplaza el antiguo `queue:monitor` script.

## 🚀 Instalación y Uso

### 1. Instalar PM2 Globalmente
```bash
npm install -g pm2
```

### 2. Iniciar Aplicación con PM2
```bash
# Compilar primero
npm run build

# Iniciar con PM2
npm run dev:pm2

# O manualmente
pm2 start ecosystem.config.js
```

### 3. Monitoreo en Tiempo Real
```bash
# Dashboard interactivo (recomendado)
pm2 monit

# Ver logs en tiempo real
pm2 logs

# Ver logs específicos
pm2 logs bullmq-app

# Web dashboard (si instalaste pm2-web)
pm2 web
# Accede a http://localhost:9615
```

## 📊 Ejemplo de Monitoreo

### Estado actual
```bash
pm2 status
```

Muestra:
```
┌─────┬──────────┬─────────┬──────┬──────────┐
│ id  │ name     │ mode    │ ↺    │ status   │
├─────┼──────────┼─────────┼──────┼──────────┤
│ 0   │ bullmq-app │ cluster │ 0   │ online   │
└─────┴──────────┴─────────┴──────┴──────────┘
```

### Logs con timestamps
```bash
pm2 logs --lines 50
```

## 🛠️ Configuración (ecosystem.config.js)

### Características Incluidas

1. **Clustering**
   ```javascript
   exec_mode: 'cluster'  // Multi-core para mejor rendimiento
   ```

2. **Memory Limit**
   ```javascript
   max_memory_restart: '500M'  // Reinicia si usa >500MB
   ```

3. **Auto-Restart**
   ```javascript
   max_restarts: 5        // Reintentar 5 veces
   min_uptime: '10s'      // Debe estar >10s para contar
   ```

4. **File Logging**
   ```javascript
   output: './logs/stdout.log'
   error: './logs/stderr.log'
   merge_logs: true
   ```

5. **Watch & Reload**
   ```javascript
   watch: ['dist']        // Recarga si dist/ cambia
   ```

## 📋 Comandos Útiles

### Desarrollo
```bash
npm run dev:pm2         # Compilar + iniciar PM2
npm run pm2:monit       # Monitoreo interactivo
npm run pm2:logs        # Ver logs
```

### Management
```bash
pm2 stop all            # Pausar todos
pm2 restart all         # Reiniciar todos
pm2 delete all          # Eliminar todos
pm2 save                # Guardar lista (para reboot)
pm2 startup             # Iniciar en reboot del sistema
```

### Debugging
```bash
pm2 describe bullmq-app # Detalles del proceso
pm2 env                 # Variables de entorno
pm2 config              # Configuración global
```

## 🔍 Ventajas vs queue:monitor

| Característica | PM2 | queue:monitor |
|---|---|---|
| **Interfaz** | Interactiva, profesional | Consola que se refresca |
| **Logs** | Persistentes, timestamped | Solo en consola |
| **Memory** | Monitorea uso de RAM | No |
| **CPU** | Monitorea uso de CPU | No |
| **Restart automático** | Sí, configurable | No |
| **Escalabilidad** | Multi-core clustering | Single instance |
| **Web Dashboard** | Opcional (pm2-web) | No |
| **Alerts** | Sí, configurable | No |
| **Production Ready** | ✅ | ❌ |

## 🚀 Ejemplos de Uso

### Startup Normal
```bash
# Terminal 1: Redis
docker-compose -f docker-compose.dev.yml up

# Terminal 2: App con PM2
npm run dev:pm2

# Terminal 3: Monitoreo
npm run pm2:monit
```

### Testing de Jobs
```bash
# Terminal 1: Iniciar app
npm run dev:pm2

# Terminal 2: Monitoreo
pm2 monit

# Terminal 3: Enviar jobs
curl -X POST http://localhost:3000/jobs/send-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","subject":"Test","body":"Hello"}'

# Verá en PM2:
# - Memoria usada
# - CPU usado
# - Logs en tiempo real
# - Uptime del proceso
```

### Ver Logs Específicos
```bash
# Últimas 100 líneas
pm2 logs bullmq-app --lines 100

# Logs con búsqueda
pm2 logs bullmq-app | grep "error"

# En tiempo real
pm2 logs bullmq-app --raw
```

## 📈 Environment Variables

Configuradas automáticamente en `ecosystem.config.js`:

**Desarrollo:**
```
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
LOG_LEVEL=info
```

**Producción:**
```
NODE_ENV=production
REDIS_HOST=redis
REDIS_PORT=6379
PORT=3000
LOG_LEVEL=warn
```

## 🔧 Customización

Edita `ecosystem.config.js` para:

1. **Cambiar número de instancias** (clustering):
   ```javascript
   instances: 2,  // o 'max' para usar todos los cores
   ```

2. **Aumentar memory limit**:
   ```javascript
   max_memory_restart: '1G',  // Para aplicaciones grandes
   ```

3. **Agregar más procesos**:
   ```javascript
   {
     name: 'bullmq-worker',
     script: './dist/worker.js',
     // ... resto de config
   }
   ```

## 🆘 Troubleshooting

### PM2 no encuentra el archivo
```bash
npm run build  # Asegúrate que dist/ existe
pm2 start ecosystem.config.js
```

### Proceso no inicia
```bash
pm2 logs bullmq-app  # Ver el error exacto
```

### Memory leak
```bash
# Aumentar limit temporalmente
pm2 delete all
pm2 start ecosystem.config.js --max-memory-restart 2G
```

### Limpieza total
```bash
pm2 delete all
pm2 kill
rm -rf ~/.pm2
```

## 📚 Recursos

- [PM2 Docs](https://pm2.keymetrics.io/)
- [Ecosystem Config](https://pm2.keymetrics.io/docs/usage/ecosystem-file/)
- [Clustering](https://pm2.keymetrics.io/docs/usage/cluster-mode/)

---

**PM2 es la forma profesional de manejar procesos Node.js en producción.** ✅
