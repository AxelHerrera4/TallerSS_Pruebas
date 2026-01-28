# Pruebas de Carga con Locust - Microservicio Cuentas

## 📋 Descripción

Scripts de Locust para simular 100 usuarios concurrentes y detectar inconsistencias en operaciones del microservicio de cuentas.

## 🛠️ Instalación

### 1. Instalar Locust y dependencias

```bash
pip install locust mysql-connector-python
```

O con archivo de requirements:

```bash
pip install -r locust/requirements.txt
```

### 2. Verificar instalación

```bash
locust --version
```

## 🚀 Ejecución

### Opción 1: Interfaz Web (Recomendado)

```bash
# Desde la raíz del proyecto
locust -f locust/locustfile.py --host=http://localhost:3000

# Abrir navegador en: http://localhost:8089
# Configurar:
#   - Number of users: 100
#   - Spawn rate: 10 (usuarios por segundo)
#   - Host: http://localhost:3000
```

### Opción 2: Sin interfaz (headless)

```bash
# 100 usuarios, 10 por segundo, durante 5 minutos
locust -f locust/locustfile.py \
  --host=http://localhost:3000 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless \
  --html locust/reportes/reporte.html
```

### Opción 3: Solo eliminaciones masivas

```bash
# Usar clase específica EliminacionMasivaUser
locust -f locust/locustfile.py \
  --host=http://localhost:3000 \
  --users 50 \
  --spawn-rate 10 \
  --run-time 2m \
  --headless \
  EliminacionMasivaUser
```

## 📊 Escenarios de Prueba

### 1. Operaciones Mixtas (CuentasUser)

- ✅ **Retiros concurrentes** (peso: 3)
- ✅ **Depósitos concurrentes** (peso: 3)
- ✅ **Actualizaciones concurrentes** (peso: 1)
- ✅ **Eliminaciones concurrentes** (peso: 1)
- ✅ **Consultas** (peso: 2)

### 2. Eliminaciones Masivas (EliminacionMasivaUser)

- Crea 5 cuentas por usuario
- Elimina concurrentemente
- Detecta dobles eliminaciones

## 🔍 Detección de Inconsistencias

El script detecta automáticamente:

- **Saldos negativos**: Cuando retiros concurrentes generan saldo < 0
- **Dobles eliminaciones**: Múltiples DELETE exitosos en la misma cuenta
- **Race conditions**: Operaciones que violan la integridad

### Ver inconsistencias en tiempo real

```bash
# Los logs aparecen en la consola durante la ejecución
# Buscar líneas con ⚠️ INCONSISTENCIA
```

### Reportes generados

Después de ejecutar Locust, se genera:

```
locust/reportes/inconsistencias_YYYYMMDD_HHMMSS.json
```

Ejemplo:
```json
{
  "timestamp": "2026-01-27T23:45:30",
  "total_inconsistencias": 15,
  "por_tipo": {
    "SALDO_NEGATIVO": 12,
    "DOUBLE_DELETE": 3
  },
  "detalles": [...]
}
```

## 🗄️ Validación de Base de Datos

Script Python para validar inconsistencias directamente en MySQL.

### Ejecutar validación

```bash
python locust/validar_inconsistencias.py
```

### Qué verifica:

1. **Saldos negativos** en tabla `cuentas`
2. **Estados inconsistentes** (activo=0 pero estado='ACTIVA')
3. **Números de cuenta duplicados**
4. **Cuentas huérfanas** (socioId inexistente - si tienes tabla socios)
5. **Estadísticas generales** (totales, promedios, etc.)

### Configuración de BD

Editar `locust/validar_inconsistencias.py`:

```python
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'cooperativa_user',
    'password': 'cooperativa123',
    'database': 'cooperativa_cuentas'
}
```

## 📈 Proceso Completo de Prueba

### ANTES de implementar validaciones

```bash
# 1. Asegurar que el microservicio está corriendo
npm run start:dev

# 2. Ejecutar Locust (5 minutos, 100 usuarios)
locust -f locust/locustfile.py \
  --host=http://localhost:3000 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless \
  --html locust/reportes/pre_validaciones.html

# 3. Validar BD
python locust/validar_inconsistencias.py

# 4. Revisar reportes
cat locust/reportes/inconsistencias_*.json
cat locust/reportes/validacion_bd_*.json
```

**Resultado esperado**: Se detectan inconsistencias (saldos negativos, race conditions)

### DESPUÉS de implementar validaciones

```bash
# 1. Implementar:
#    - Locks de DB (SELECT FOR UPDATE)
#    - Transacciones ACID
#    - Validaciones de negocio mejoradas

# 2. Reiniciar BD (limpiar datos de prueba)
docker-compose down -v
docker-compose up -d

# 3. Reiniciar microservicio
npm run start:dev

# 4. Ejecutar Locust nuevamente
locust -f locust/locustfile.py \
  --host=http://localhost:3000 \
  --users 100 \
  --spawn-rate 10 \
  --run-time 5m \
  --headless \
  --html locust/reportes/post_validaciones.html

# 5. Validar BD
python locust/validar_inconsistencias.py

# 6. Comparar reportes
diff locust/reportes/pre_validaciones.html locust/reportes/post_validaciones.html
```

**Resultado esperado**: 
- ✅ Cero inconsistencias
- ⚠️ Posible degradación de performance (más latencia por locks)

## 📊 Métricas Clave a Monitorear

### Performance

- **Requests per second (RPS)**
- **Response time (P50, P95, P99)**
- **Failure rate**

### Inconsistencias

- **Total de saldos negativos**
- **Total de eliminaciones duplicadas**
- **Cuentas con estado inconsistente**

### Comparación Pre/Post

```
Métrica                | Pre-Validación | Post-Validación | Cambio
-----------------------|----------------|-----------------|--------
RPS                    | 250            | 180             | -28%
P95 Response Time      | 120ms          | 350ms           | +192%
Inconsistencias        | 25             | 0               | -100% ✅
Failure Rate           | 2%             | 0.1%            | -95% ✅
```

## 🐛 Troubleshooting

### Error: Connection refused

```bash
# Verificar que el microservicio está corriendo
curl http://localhost:3000/cuentas

# Si no responde, iniciar:
npm run start:dev
```

### Error: MySQL connection failed

```bash
# Verificar que MySQL está corriendo
docker ps | grep mysql

# Si no está corriendo:
docker-compose up -d mysql

# Verificar credenciales en validar_inconsistencias.py
```

### No se generan reportes

```bash
# Crear carpeta manualmente
mkdir -p locust/reportes

# Verificar permisos
chmod 755 locust/reportes
```

## 📝 Ejemplos de Comandos

### Prueba rápida (30 segundos, 10 usuarios)

```bash
locust -f locust/locustfile.py \
  --host=http://localhost:3000 \
  --users 10 \
  --spawn-rate 2 \
  --run-time 30s \
  --headless
```

### Prueba extendida (30 minutos, 200 usuarios)

```bash
locust -f locust/locustfile.py \
  --host=http://localhost:3000 \
  --users 200 \
  --spawn-rate 20 \
  --run-time 30m \
  --headless \
  --html locust/reportes/stress_test.html \
  --csv locust/reportes/stress_test
```

### Solo retiros y depósitos

Modificar `locustfile.py` y comentar otros `@task`, dejar solo:
- `realizar_retiro_concurrente`
- `realizar_deposito_concurrente`

## 🎯 Objetivos de las Pruebas

1. ✅ **Detectar race conditions** en retiros/depósitos concurrentes
2. ✅ **Identificar saldos negativos** causados por falta de locks
3. ✅ **Medir impacto de validaciones** en performance
4. ✅ **Generar evidencia** de problemas antes/después
5. ✅ **Validar integridad** de datos en BD

## 📚 Referencias

- [Locust Documentation](https://docs.locust.io/)
- [MySQL Locking](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html)
- [TypeORM Transactions](https://typeorm.io/transactions)
