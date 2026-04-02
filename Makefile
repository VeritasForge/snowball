.PHONY: run be fe help list-users reset-password update-prices

# Default target
help:
	@echo "Available commands:"
	@echo "  make be                              - Run the backend server"
	@echo "  make fe                              - Run the frontend server"
	@echo ""
	@echo "  make list-users                      - 가입된 사용자 목록 조회"
	@echo "  make reset-password EMAIL=? PWD=?    - 비밀번호 재설정"
	@echo "  make update-prices                   - 모든 자산 현재가 갱신 (배치)"

# 'run' is a dummy target to allow 'make run be' syntax (compatibility)
run:
	@:

be:
	@echo "Starting Backend..."
	cd backend && uv run uvicorn main:app --reload

fe:
	@echo "Starting Frontend..."
	cd frontend && npm run dev

list-users:
	cd backend && uv run python scripts/manage.py list-users

reset-password:
	@test -n "$(EMAIL)" || (echo "Error: EMAIL is required. Usage: make reset-password EMAIL=user@example.com PWD=newpassword" && exit 1)
	@test -n "$(PWD)" || (echo "Error: PWD is required. Usage: make reset-password EMAIL=user@example.com PWD=newpassword" && exit 1)
	cd backend && uv run python scripts/manage.py reset-password $(EMAIL) $(PWD)

update-prices:
	cd backend && uv run python scripts/manage.py update-prices
