@echo off
REM Script para validar inconsistencias en la base de datos

echo ========================================
echo VALIDACION DE INCONSISTENCIAS - BASE DE DATOS
echo ========================================
echo.

REM Verificar que MySQL está corriendo
echo [1/2] Verificando conexion a MySQL...
docker ps | findstr mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo ADVERTENCIA: No se detecta MySQL en Docker
    echo Asegurate de que MySQL este corriendo
    echo.
)

echo [2/2] Ejecutando validacion...
echo.

D:\taller-pruebas-unitarias\microservicio-cuentas\.venv\Scripts\python.exe locust/validar_inconsistencias.py

echo.
echo ========================================
pause
