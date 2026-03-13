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

echo "Build completado con éxito."
