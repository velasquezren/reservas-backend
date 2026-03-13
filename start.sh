#!/usr/bin/env bash
set -e

echo "Running migrations and seeders..."
php artisan migrate:fresh --seed --force

echo "Starting Apache..."
exec apache2-foreground
