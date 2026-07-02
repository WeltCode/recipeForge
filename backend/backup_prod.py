"""Guarda una copia de seguridad de la base de datos de PRODUCCIÓN.

Lee PROD_DATABASE_URL de backend/.env, se conecta a producción (sin tocar tu
base local) y exporta todas las recetas, usuarios y restaurantes a un archivo
JSON con fecha en backend/backups/. Para restaurar: loaddata sobre ese archivo.
"""
import os
import sys
from datetime import datetime
from pathlib import Path

import django
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE))
load_dotenv(BASE / '.env')

prod = os.environ.get('PROD_DATABASE_URL')
if not prod:
    print('ERROR: falta PROD_DATABASE_URL en backend/.env')
    sys.exit(1)

# Forzar que Django use la base de PRODUCCIÓN para este script.
os.environ['DATABASE_URL'] = prod
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.management import call_command  # noqa: E402
from django.db import connection  # noqa: E402

backups = BASE / 'backups'
backups.mkdir(exist_ok=True)
ts = datetime.now().strftime('%Y%m%d_%H%M%S')
out = backups / f'produccion_{ts}.json'

print(f'Conectando a producción: {connection.settings_dict.get("HOST")}')
with open(out, 'w', encoding='utf-8') as f:
    call_command(
        'dumpdata',
        exclude=['contenttypes', 'auth.permission', 'admin.logentry', 'sessions'],
        indent=2,
        stdout=f,
    )

size_kb = out.stat().st_size / 1024
print(f'\nRespaldo guardado: {out}  ({size_kb:.0f} KB)')
print('Para restaurar (con cuidado): manage.py loaddata "<archivo>"')
