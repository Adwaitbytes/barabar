FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-cache-dir . psycopg[binary]
ENV DATABASE_URL=sqlite:////data/barabar.db
VOLUME ["/data"]
EXPOSE 8000
CMD ["uvicorn", "barabar.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
