.PHONY: run be fe help

# Default target
help:
	@echo "Available commands:"
	@echo "  make be       - Run the backend server"
	@echo "  make fe       - Run the frontend server"

# 'run' is a dummy target to allow 'make run be' syntax (compatibility)
run:
	@:

be:
	@echo "Starting Backend..."
	cd backend && uv run uvicorn main:app --reload

fe:
	@echo "Starting Frontend..."
	cd frontend && npm run dev
