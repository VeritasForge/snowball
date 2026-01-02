# Snowball - 자산배분 대시보드

투자 포트폴리오를 관리하고 목표 비중에 따른 리밸런싱 필요 금액과 수량을 자동으로 계산해주는 웹 대시보드입니다.

## 기술 스택
-   **Frontend**: Next.js 13+, TypeScript, Tailwind CSS
-   **Backend**: Python (FastAPI), SQLModel, Uvicorn
-   **Database**: PostgreSQL (Docker)

## 시작하기 (Getting Started)

### 1. 데이터베이스 실행
Docker가 실행 중인지 확인한 후, 아래 명령어로 DB 컨테이너를 실행합니다.
```bash
docker-compose up -d
```

### 2. 백엔드(Backend) 설정 및 실행
백엔드는 Python 패키지 매니저인 `uv`를 사용합니다.
```bash
cd backend

# 서버 실행 (필요한 패키지가 자동으로 설치됩니다)
uv run uvicorn main:app --reload --port 8000
```
서버가 실행되면 API 문서는 http://localhost:8000/docs 에서 확인할 수 있습니다.

### 3. 프론트엔드(Frontend) 설정 및 실행
**주의:** `npm install` 시 권한 오류가 발생할 경우 아래 해결 방법을 참고하세요.

```bash
cd frontend

# 의존성 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```
브라우저에서 http://localhost:3000 으로 접속하여 대시보드를 사용하세요.

### ⚠️ npm install 권한 오류 해결 방법
만약 `npm install` 실행 시 `EACCES: permission denied` 에러가 발생한다면, 다음 명령어를 순서대로 실행하여 권한을 복구하고 재시도하세요.

1. **npm 캐시 폴더 소유권 복구** (비밀번호 입력 필요)
   ```bash
   sudo chown -R $(whoami) ~/.npm
   ```

2. **캐시 및 모듈 정리**
   ```bash
   npm cache clean --force
   cd frontend
   rm -rf node_modules package-lock.json
   ```

3. **다시 설치**
   ```bash
   npm install
   ```
   *그래도 안 될 경우:* `npm install --force`

## 주요 기능
1.  **자산 설정**: "미국주식", "금" 등 자산명과 목표 비중(%)을 등록합니다.
2.  **현재 상태 입력**: 각 자산의 현재가와 보유 수량을 입력합니다.
3.  **리밸런싱 계산**: 현재 예수금(투자 가능 현금)을 입력하고 "리밸런싱 계산하기" 버튼을 누릅니다.
4.  **매매 가이드**: 목표 비중을 맞추기 위해 어떤 자산을 얼마나 매수/매도해야 하는지 구체적인 금액과 수량을 확인합니다.

---

## 테스트 실행 방법 (TDD)

본 프로젝트는 TDD 원칙을 준수하며, 핵심 비즈니스 로직(리밸런싱 계산 등)은 백엔드 테스트를 통해 검증됩니다.

### 백엔드 테스트 실행 (`pytest`)
백엔드 디렉토리에서 아래 명령어를 통해 작성된 테스트를 실행할 수 있습니다.

```bash
cd backend

# 모든 테스트 실행
PYTHONPATH=. uv run pytest

# 상세 결과 확인 (-v 옵션)
PYTHONPATH=. uv run pytest -v
```

**검증 항목:**
*   계좌(Portfolio) 생성 및 관리 로직
*   자산별 목표 금액 및 리밸런싱 매수/매도 수량 계산 로직
*   실제 매매 체결 시 예수금 차감 및 평단가 갱신 로직