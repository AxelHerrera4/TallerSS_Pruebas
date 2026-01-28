"""
Script de Validación de Inconsistencias en Base de Datos
Conecta a MySQL y verifica:
- Saldos negativos
- Cuentas con estado inconsistente
- Duplicados
- Integridad referencial
"""
import mysql.connector
from datetime import datetime
import json
import sys

# Configuración de conexión (ajustar según .env o docker-compose)
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'cooperativa_user',
    'password': 'cooperativa123',
    'database': 'cooperativa_cuentas'
}

class ValidadorInconsistencias:
    def __init__(self):
        self.conexion = None
        self.cursor = None
        self.inconsistencias = []
    
    def conectar(self):
        """Conectar a la base de datos"""
        try:
            self.conexion = mysql.connector.connect(**DB_CONFIG)
            self.cursor = self.conexion.cursor(dictionary=True)
            print("✅ Conexión a MySQL exitosa")
            return True
        except Exception as e:
            print(f"❌ Error conectando a MySQL: {e}")
            return False
    
    def verificar_saldos_negativos(self):
        """Detectar cuentas con saldo negativo"""
        query = """
        SELECT id, numeroCuenta, saldo, estado, activo
        FROM cuentas
        WHERE saldo < 0
        """
        
        self.cursor.execute(query)
        resultados = self.cursor.fetchall()
        
        if resultados:
            print(f"\n⚠️  SALDOS NEGATIVOS DETECTADOS: {len(resultados)}")
            for cuenta in resultados:
                inconsistencia = {
                    "tipo": "SALDO_NEGATIVO",
                    "cuenta_id": cuenta['id'],
                    "numero_cuenta": cuenta['numeroCuenta'],
                    "saldo": float(cuenta['saldo']),
                    "estado": cuenta['estado'],
                    "activo": cuenta['activo']
                }
                self.inconsistencias.append(inconsistencia)
                print(f"  - Cuenta {cuenta['numeroCuenta']}: Saldo = {cuenta['saldo']}")
        else:
            print("\n✅ No se encontraron saldos negativos")
        
        return len(resultados)
    
    def verificar_estado_inconsistente(self):
        """Detectar cuentas con estado activo pero marcadas como inactivas"""
        query = """
        SELECT id, numeroCuenta, estado, activo
        FROM cuentas
        WHERE (estado = 'ACTIVA' AND activo = 0)
           OR (estado IN ('CANCELADA', 'SUSPENDIDA') AND activo = 1)
        """
        
        self.cursor.execute(query)
        resultados = self.cursor.fetchall()
        
        if resultados:
            print(f"\n⚠️  ESTADOS INCONSISTENTES DETECTADOS: {len(resultados)}")
            for cuenta in resultados:
                inconsistencia = {
                    "tipo": "ESTADO_INCONSISTENTE",
                    "cuenta_id": cuenta['id'],
                    "numero_cuenta": cuenta['numeroCuenta'],
                    "estado": cuenta['estado'],
                    "activo": cuenta['activo']
                }
                self.inconsistencias.append(inconsistencia)
                print(f"  - Cuenta {cuenta['numeroCuenta']}: Estado={cuenta['estado']}, Activo={cuenta['activo']}")
        else:
            print("\n✅ No se encontraron estados inconsistentes")
        
        return len(resultados)
    
    def verificar_numeros_duplicados(self):
        """Detectar números de cuenta duplicados entre cuentas activas"""
        query = """
        SELECT numeroCuenta, COUNT(*) as total
        FROM cuentas
        WHERE activo = 1
        GROUP BY numeroCuenta
        HAVING COUNT(*) > 1
        """
        
        self.cursor.execute(query)
        resultados = self.cursor.fetchall()
        
        if resultados:
            print(f"\n⚠️  NÚMEROS DE CUENTA DUPLICADOS: {len(resultados)}")
            for item in resultados:
                inconsistencia = {
                    "tipo": "NUMERO_DUPLICADO",
                    "numero_cuenta": item['numeroCuenta'],
                    "total_duplicados": item['total']
                }
                self.inconsistencias.append(inconsistencia)
                print(f"  - Número {item['numeroCuenta']}: {item['total']} duplicados")
        else:
            print("\n✅ No se encontraron números duplicados")
        
        return len(resultados)
    
    def verificar_cuentas_huerfanas(self):
        """
        Detectar cuentas que referencian socios inexistentes
        (solo si tienes tabla de socios)
        """
        # Esta query asume que tienes tabla 'socios'
        # Si no la tienes, comenta esta función
        query = """
        SELECT c.id, c.numeroCuenta, c.socioId
        FROM cuentas c
        LEFT JOIN socios s ON c.socioId = s.id
        WHERE s.id IS NULL AND c.activo = 1
        """
        
        try:
            self.cursor.execute(query)
            resultados = self.cursor.fetchall()
            
            if resultados:
                print(f"\n⚠️  CUENTAS HUÉRFANAS (socio inexistente): {len(resultados)}")
                for cuenta in resultados:
                    inconsistencia = {
                        "tipo": "SOCIO_INEXISTENTE",
                        "cuenta_id": cuenta['id'],
                        "numero_cuenta": cuenta['numeroCuenta'],
                        "socio_id": cuenta['socioId']
                    }
                    self.inconsistencias.append(inconsistencia)
                    print(f"  - Cuenta {cuenta['numeroCuenta']}: SocioID={cuenta['socioId']} no existe")
            else:
                print("\n✅ No se encontraron cuentas huérfanas")
            
            return len(resultados)
        except Exception as e:
            print(f"\n⚠️  No se pudo verificar cuentas huérfanas (tabla socios no existe?): {e}")
            return 0
    
    def generar_estadisticas(self):
        """Generar estadísticas generales de la BD"""
        print("\n" + "=" * 80)
        print("ESTADÍSTICAS GENERALES")
        print("=" * 80)
        
        # Total de cuentas
        self.cursor.execute("SELECT COUNT(*) as total FROM cuentas")
        total = self.cursor.fetchone()['total']
        print(f"Total de cuentas: {total}")
        
        # Cuentas activas
        self.cursor.execute("SELECT COUNT(*) as total FROM cuentas WHERE activo = 1")
        activas = self.cursor.fetchone()['total']
        print(f"Cuentas activas: {activas}")
        
        # Cuentas por estado
        self.cursor.execute("""
            SELECT estado, COUNT(*) as total
            FROM cuentas
            GROUP BY estado
        """)
        por_estado = self.cursor.fetchall()
        print("\nCuentas por estado:")
        for item in por_estado:
            print(f"  - {item['estado']}: {item['total']}")
        
        # Saldo total
        self.cursor.execute("SELECT SUM(saldo) as total FROM cuentas WHERE activo = 1")
        saldo_total = self.cursor.fetchone()['total'] or 0
        print(f"\nSaldo total en el sistema: ${saldo_total:,.2f}")
        
        # Saldo promedio
        if activas > 0:
            promedio = float(saldo_total) / activas
            print(f"Saldo promedio por cuenta: ${promedio:,.2f}")
    
    def guardar_reporte(self):
        """Guardar reporte JSON con todas las inconsistencias"""
        import os
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        os.makedirs("locust/reportes", exist_ok=True)
        filename = f"locust/reportes/validacion_bd_{timestamp}.json"
        
        reporte = {
            "timestamp": datetime.now().isoformat(),
            "total_inconsistencias": len(self.inconsistencias),
            "inconsistencias_por_tipo": {},
            "detalles": self.inconsistencias
        }
        
        # Contar por tipo
        for inc in self.inconsistencias:
            tipo = inc["tipo"]
            reporte["inconsistencias_por_tipo"][tipo] = \
                reporte["inconsistencias_por_tipo"].get(tipo, 0) + 1
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(reporte, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Reporte guardado en: {filename}")
        return filename
    
    def ejecutar_validacion_completa(self):
        """Ejecutar todas las validaciones"""
        print("=" * 80)
        print("VALIDACIÓN DE INCONSISTENCIAS - BASE DE DATOS")
        print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        if not self.conectar():
            return False
        
        try:
            # Ejecutar todas las verificaciones
            self.verificar_saldos_negativos()
            self.verificar_estado_inconsistente()
            self.verificar_numeros_duplicados()
            # self.verificar_cuentas_huerfanas()  # Descomentar si tienes tabla socios
            
            # Estadísticas
            self.generar_estadisticas()
            
            # Resumen
            print("\n" + "=" * 80)
            print("RESUMEN")
            print("=" * 80)
            
            if self.inconsistencias:
                print(f"❌ Se encontraron {len(self.inconsistencias)} inconsistencias")
                
                # Agrupar por tipo
                por_tipo = {}
                for inc in self.inconsistencias:
                    tipo = inc["tipo"]
                    por_tipo[tipo] = por_tipo.get(tipo, 0) + 1
                
                print("\nPor tipo:")
                for tipo, cantidad in por_tipo.items():
                    print(f"  - {tipo}: {cantidad}")
                
                # Guardar reporte
                self.guardar_reporte()
            else:
                print("✅ No se encontraron inconsistencias en la base de datos")
            
            print("=" * 80)
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error durante la validación: {e}")
            return False
        
        finally:
            if self.cursor:
                self.cursor.close()
            if self.conexion:
                self.conexion.close()
            print("\n✅ Conexión cerrada")


if __name__ == "__main__":
    validador = ValidadorInconsistencias()
    exito = validador.ejecutar_validacion_completa()
    sys.exit(0 if exito else 1)
