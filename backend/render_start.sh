#!/usr/bin/env bash
set -e
gunicorn -k uvicorn.workers.UvicornWorker backend.app.main:app --bind 0.0.0.0:${PORT:-10000} --workers 2
