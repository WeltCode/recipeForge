"""Copia de seguridad de las FOTOS/LOGOS del bucket R2 de producción.

Descarga todos los objetos del bucket de Cloudflare R2 (fotos de platos y
logos de restaurantes) a backend/backups/media_<fecha>/, reusando las
credenciales R2 de backend/.env. Es de solo lectura sobre R2 (no borra ni
modifica nada). Complementa a backup_prod.py, que solo guarda la base de
datos (las fotos no están en la BD, solo sus URLs).
"""
import os
import sys
from datetime import datetime
from pathlib import Path

import boto3
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / '.env')

key = os.environ.get('R2_ACCESS_KEY_ID')
secret = os.environ.get('R2_SECRET_ACCESS_KEY')
bucket = os.environ.get('R2_BUCKET_NAME')
endpoint = os.environ.get('R2_ENDPOINT_URL')

if not all([key, secret, bucket, endpoint]):
    print('ERROR: faltan credenciales R2 en backend/.env')
    sys.exit(1)

s3 = boto3.client(
    's3',
    endpoint_url=endpoint,
    aws_access_key_id=key,
    aws_secret_access_key=secret,
    region_name='auto',
)

ts = datetime.now().strftime('%Y%m%d_%H%M%S')
outdir = BASE / 'backups' / f'media_{ts}'
outdir.mkdir(parents=True, exist_ok=True)

print(f'Descargando bucket "{bucket}" a {outdir} ...\n')
paginator = s3.get_paginator('list_objects_v2')
count = 0
total = 0
for page in paginator.paginate(Bucket=bucket):
    for obj in page.get('Contents', []):
        k = obj['Key']
        dest = outdir / k
        dest.parent.mkdir(parents=True, exist_ok=True)
        s3.download_file(bucket, k, str(dest))
        count += 1
        total += obj['Size']
        print(f'  {k}  ({obj["Size"] / 1024:.0f} KB)')

print(f'\n{count} archivos ({total / 1024 / 1024:.1f} MB) guardados en {outdir}')
if count == 0:
    print('(el bucket parece vacío)')
