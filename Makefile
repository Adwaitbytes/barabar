PY := .venv/bin/python
BARABAR := .venv/bin/barabar

.PHONY: install test test-all lint typecheck demo evals generate docs api web seed clean

install:
	uv venv --python 3.12 .venv
	uv pip install -e ".[dev]"
	cd apps/web && pnpm install

test:
	$(PY) -m pytest -q -m "not perf and not agent"

test-all:
	$(PY) -m pytest -q

lint:
	.venv/bin/ruff check src tests && .venv/bin/ruff format --check src tests
	.venv/bin/lint-imports

typecheck:
	.venv/bin/pyright src

demo:
	$(BARABAR) demo --n 600 --seed 42

evals:
	$(BARABAR) evals --sizes 60,600,6000

generate:
	$(BARABAR) generate --n 60 --out evals/datasets/60
	$(BARABAR) generate --n 600 --out evals/datasets/600
	$(BARABAR) generate --n 6000 --out evals/datasets/6000

docs:
	$(PY) -m barabar.core.exceptions --write docs/EXCEPTIONS.md

api:
	.venv/bin/uvicorn barabar.api.app:app --reload --port 8000

web:
	cd apps/web && pnpm dev

seed:
	$(PY) -m barabar.adapters.razorpay_seed

clean:
	rm -rf .pytest_cache .hypothesis .ruff_cache data/local/*.db
