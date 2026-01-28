"""
Script Locust para Pruebas de Carga - Microservicio Cuentas
Simula 100 usuarios concurrentes realizando operaciones y detecta inconsistencias
"""
from locust import HttpUser, task, between, events
import random
import json
import logging
from datetime import datetime

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Variables globales para tracking
inconsistencias = []
cuentas_creadas = []
saldos_inconsistentes = []


class CuentasUser(HttpUser):
    """Usuario que simula operaciones concurrentes en el microservicio de cuentas"""
    
    wait_time = between(1, 3)  # Espera entre 1-3 segundos entre tareas
    
    def on_start(self):
        """Ejecutado al inicio de cada usuario - crear cuenta de prueba"""
        self.cuenta_id = None
        self.numero_cuenta = f"TEST-{random.randint(100000, 999999)}"
        self.socio_id = f"{random.randint(1, 100)}"
        
        # Crear cuenta inicial
        self.crear_cuenta_inicial()
    
    def crear_cuenta_inicial(self):
        """Crear cuenta con saldo inicial para pruebas"""
        payload = {
            "socioId": self.socio_id,
            "numeroCuenta": self.numero_cuenta,
            "tipoCuenta": random.choice(["AHORRO", "CORRIENTE", "PLAZO_FIJO"]),
            "saldo": 10000.0
        }
        
        with self.client.post("/cuentas", json=payload, catch_response=True) as response:
            if response.status_code == 201:
                data = response.json()
                self.cuenta_id = data.get("id")
                self.saldo_inicial = data.get("saldo", 10000.0)
                cuentas_creadas.append({
                    "id": self.cuenta_id,
                    "numero": self.numero_cuenta,
                    "saldo_inicial": self.saldo_inicial
                })
                response.success()
                logger.info(f"Cuenta creada: {self.cuenta_id}")
            else:
                response.failure(f"Error creando cuenta: {response.status_code}")
    
    @task(3)
    def realizar_retiro_concurrente(self):
        """Retiros concurrentes para detectar race conditions"""
        if not self.cuenta_id:
            return
        
        monto = random.uniform(100, 500)
        
        with self.client.post(
            f"/cuentas/{self.cuenta_id}/retiro",
            json={"monto": monto},
            catch_response=True,
            name="/cuentas/[id]/retiro"
        ) as response:
            if response.status_code == 200:
                data = response.json()
                nuevo_saldo = data.get("saldo")
                
                # Validar que el saldo no sea negativo
                if nuevo_saldo < 0:
                    inconsistencias.append({
                        "tipo": "SALDO_NEGATIVO",
                        "cuenta_id": self.cuenta_id,
                        "saldo": nuevo_saldo,
                        "operacion": "retiro",
                        "timestamp": datetime.now().isoformat()
                    })
                    logger.error(f"⚠️ INCONSISTENCIA: Saldo negativo detectado: {nuevo_saldo}")
                    response.failure(f"Saldo negativo: {nuevo_saldo}")
                else:
                    response.success()
            elif response.status_code == 409:
                # Saldo insuficiente es esperado
                response.success()
            else:
                response.failure(f"Error en retiro: {response.status_code}")
    
    @task(3)
    def realizar_deposito_concurrente(self):
        """Depósitos concurrentes"""
        if not self.cuenta_id:
            return
        
        monto = random.uniform(200, 800)
        
        with self.client.post(
            f"/cuentas/{self.cuenta_id}/deposito",
            json={"monto": monto},
            catch_response=True,
            name="/cuentas/[id]/deposito"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Error en depósito: {response.status_code}")
    
    @task(2)
    def obtener_cuenta(self):
        """Obtener información de cuenta"""
        if not self.cuenta_id:
            return
        
        with self.client.get(
            f"/cuentas/{self.cuenta_id}",
            catch_response=True,
            name="/cuentas/[id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Error obteniendo cuenta: {response.status_code}")
    
    @task(1)
    def actualizar_cuenta_concurrente(self):
        """Actualizaciones concurrentes para detectar conflictos"""
        if not self.cuenta_id:
            return
        
        payload = {
            "socioId": self.socio_id,
            "numeroCuenta": self.numero_cuenta,
            "tipoCuenta": random.choice(["AHORRO", "CORRIENTE"]),
            "saldo": random.uniform(1000, 5000)
        }
        
        with self.client.put(
            f"/cuentas/{self.cuenta_id}",
            json=payload,
            catch_response=True,
            name="/cuentas/[id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 409:
                # Conflicto esperado en actualizaciones concurrentes
                response.success()
            else:
                response.failure(f"Error actualizando: {response.status_code}")
    
    @task(1)
    def eliminar_cuenta_concurrente(self):
        """
        Eliminaciones concurrentes - detecta si se puede eliminar
        cuenta múltiples veces o si hay problemas de concurrencia
        """
        if not self.cuenta_id:
            return
        
        # Solo intentar eliminar algunas veces
        if random.random() > 0.8:
            with self.client.delete(
                f"/cuentas/{self.cuenta_id}",
                catch_response=True,
                name="/cuentas/[id]"
            ) as response:
                if response.status_code == 200:
                    logger.info(f"Cuenta eliminada: {self.cuenta_id}")
                    response.success()
                    # Ya no usar esta cuenta
                    self.cuenta_id = None
                elif response.status_code == 404:
                    # Ya fue eliminada - posible race condition
                    inconsistencias.append({
                        "tipo": "ELIMINACION_DUPLICADA",
                        "cuenta_id": self.cuenta_id,
                        "timestamp": datetime.now().isoformat()
                    })
                    response.success()
                else:
                    response.failure(f"Error eliminando: {response.status_code}")
    
    @task(1)
    def listar_cuentas(self):
        """Listar todas las cuentas"""
        with self.client.get("/cuentas", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Error listando cuentas: {response.status_code}")
    
    @task(1)
    def listar_cuentas_por_socio(self):
        """Listar cuentas por socio"""
        with self.client.get(
            f"/cuentas/socio/{self.socio_id}",
            catch_response=True,
            name="/cuentas/socio/[id]"
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Error listando por socio: {response.status_code}")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Ejecutado al finalizar las pruebas - genera reporte de inconsistencias"""
    logger.info("=" * 80)
    logger.info("REPORTE DE INCONSISTENCIAS")
    logger.info("=" * 80)
    
    if inconsistencias:
        logger.error(f"\n⚠️  Se detectaron {len(inconsistencias)} INCONSISTENCIAS:\n")
        
        # Agrupar por tipo
        por_tipo = {}
        for inc in inconsistencias:
            tipo = inc["tipo"]
            por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
        
        for tipo, cantidad in por_tipo.items():
            logger.error(f"  - {tipo}: {cantidad} ocurrencias")
        
        # Guardar reporte detallado
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        reporte_file = f"locust/reportes/inconsistencias_{timestamp}.json"
        
        try:
            import os
            os.makedirs("locust/reportes", exist_ok=True)
            
            with open(reporte_file, "w") as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "total_inconsistencias": len(inconsistencias),
                    "por_tipo": por_tipo,
                    "detalles": inconsistencias,
                    "cuentas_creadas": len(cuentas_creadas)
                }, f, indent=2)
            
            logger.info(f"\n✅ Reporte guardado en: {reporte_file}")
        except Exception as e:
            logger.error(f"Error guardando reporte: {e}")
    else:
        logger.info("\n✅ No se detectaron inconsistencias durante la prueba")
    
    logger.info(f"\n📊 Estadísticas:")
    logger.info(f"  - Cuentas creadas: {len(cuentas_creadas)}")
    logger.info(f"  - Inconsistencias totales: {len(inconsistencias)}")
    logger.info("=" * 80)


# Clase para pruebas específicas de eliminación masiva
class EliminacionMasivaUser(HttpUser):
    """Usuario específico para probar eliminaciones concurrentes masivas"""
    
    wait_time = between(0.5, 1.5)
    
    def on_start(self):
        """Crear múltiples cuentas para eliminar"""
        self.cuentas_ids = []
        for i in range(5):
            numero = f"DELETE-{random.randint(100000, 999999)}"
            payload = {
                "socioId": f"{random.randint(1, 50)}",
                "numeroCuenta": numero,
                "tipoCuenta": "AHORRO",
                "saldo": 1000.0
            }
            
            response = self.client.post("/cuentas", json=payload)
            if response.status_code == 201:
                data = response.json()
                self.cuentas_ids.append(data.get("id"))
    
    @task
    def eliminar_concurrente(self):
        """Eliminar cuentas concurrentemente"""
        if not self.cuentas_ids:
            return
        
        cuenta_id = random.choice(self.cuentas_ids)
        
        with self.client.delete(
            f"/cuentas/{cuenta_id}",
            catch_response=True,
            name="/cuentas/[id] (eliminación masiva)"
        ) as response:
            if response.status_code == 200:
                response.success()
                if cuenta_id in self.cuentas_ids:
                    self.cuentas_ids.remove(cuenta_id)
            elif response.status_code == 404:
                # Ya eliminada - race condition
                inconsistencias.append({
                    "tipo": "DOUBLE_DELETE",
                    "cuenta_id": cuenta_id,
                    "timestamp": datetime.now().isoformat()
                })
                response.success()
            else:
                response.failure(f"Error: {response.status_code}")
