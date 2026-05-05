FROM python:3.12-slim

WORKDIR /app

# Dependencias del sistema requeridas por psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir gunicorn

COPY . .

EXPOSE 8000

# Gunicorn + workers Uvicorn: reemplaza "uvicorn --reload" del entorno de desarrollo
# Regla de workers: (2 × núcleos_CPU) + 1  →  ajustar según el servidor destino
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--access-logfile", "-"]
