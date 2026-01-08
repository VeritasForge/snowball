.PHONY: run be fe help

# Default target
help:
	@echo "Available commands:"
	@echo "  make run be   - Run the backend server"
	@echo "  make run fe   - Run the frontend server"
	@echo "  make be       - Shortcut for backend"
	@echo "  make fe       - Shortcut for frontend"

# 'run' is a dummy target to allow 'make run be' syntax
run:
	@:

be:
	@echo "Starting Backend..."
	cd backend && uv run uvicorn main:app --reload

fe:
	@echo "Starting Frontend..."
	cd frontend && npm run dev
