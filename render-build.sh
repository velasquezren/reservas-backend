#!/usr/bin/env bash
# Salir si ocurre algún error
set -e

echo "Instalando dependencias de PHP..."
composer install --prefer-dist --no-dev --optimize-autoloader --no-interaction

echo "Instalando dependencias de Node..."
npm install

echo "Compilando assets de frontend..."
npm run build

echo "Asegurando que la clave de la app esté generada..."
# key:generate en producción suele pedir confirmación, --force la omite
php artisan key:generate --force || true

echo "Optimizando Laravel..."
php artisan optimize:clear
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

echo "Ejecutando migraciones y seeders para la demostración..."
# IMPORTANTE: migrate:fresh borra todas las tablas y las crea desde cero.
# Como pediste que se suba con los seeders y el proyecto completo desde cero, es ideal.
# PERO, si más adelante haces cambios al código y haces nuevos commits "git push",
# Render volverá a ejecutar este script. Si no quieres perder los datos que los usuarios
# hayan creado, cambia la línea de abajo a solamente: php artisan migrate --force
php artisan migrate:fresh --seed --force

echo "Build completado con éxito."
