@echo off
echo =============================================
echo   McVill Mobile - Instalacion
echo =============================================
echo.
echo Instalando dependencias...
call npm install
if %errorlevel% neq 0 ( echo ERROR en npm install & pause & exit /b 1 )

echo.
echo =============================================
echo   Listo! Para iniciar el app:
echo.
echo   npx expo start
echo   Escanea el QR con la app Expo Go
echo   (Android o iOS)
echo =============================================
pause
