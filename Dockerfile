FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY backend/requirements.txt backend/requirements.txt
RUN python -m pip install --upgrade pip && python -m pip install -r backend/requirements.txt

COPY backend backend
COPY frontend frontend

EXPOSE 10000

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

CMD ["sh", "-c", "gunicorn -k uvicorn.workers.UvicornWorker backend.app.main:app --bind 0.0.0.0:${PORT:-10000} --workers 2"]
