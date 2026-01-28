@echo off
REM Script para ejecutar pruebas de carga con Locust
REM Microservicio de Cuentas

echo ========================================
echo PRUEBAS DE CARGA - MICROSERVICIO CUENTAS
echo ========================================
echo.

REM Verificar que el microservicio está corriendo
echo [1/3] Verificando que el microservicio esta corriendo...
curl -s http://localhost:3000/cuentas >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: El microservicio no esta corriendo en http://localhost:3000
    echo Por favor ejecuta: npm run start:dev
    pause
    exit /b 1
)
echo OK - Microservicio respondiendo

echo.
echo [2/3] Iniciando Locust...
echo Configuracion:
echo   - Usuarios: 100
echo   - Spawn rate: 10 usuarios/segundo
echo   - Duracion: 5 minutos
echo   - Host: http://localhost:3000
echo.
echo Abriendo navegador en http://localhost:8089
echo Presiona Ctrl+C para detener cuando termine
echo.

REM Ejecutar Locust con interfaz web
D:\taller-pruebas-unitarias\microservicio-cuentas\.venv\Scripts\locust.exe ^
  -f locust/locustfile.py ^
  --host=http://localhost:3000

pause
