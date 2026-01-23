# /build-fix - Fix Build Errors

빌드 오류를 진단하고 수정합니다.

## Usage

```
/build-fix              # 전체 프로젝트 빌드 검사
/build-fix backend      # 백엔드만
/build-fix frontend     # 프론트엔드만
```

## Workflow

1. **빌드 실행**: 빌드 명령 실행하여 오류 수집
2. **오류 분석**: 오류 메시지 파싱 및 원인 분석
3. **수정 제안**: 구체적인 수정 방안 제시
4. **검증**: 수정 후 재빌드하여 확인

## Build Commands

### Backend
```bash
# 타입 체크
cd backend && uv run mypy src/

# 린팅
cd backend && uv run ruff check .

# 테스트
cd backend && uv run pytest
```

### Frontend
```bash
# 타입 체크
cd frontend && npx tsc --noEmit

# 린팅
cd frontend && npm run lint

# 빌드
cd frontend && npm run build
```

## Common Errors

### TypeScript Errors
```
TS2339: Property 'x' does not exist on type 'Y'
→ 타입 정의 확인 및 수정

TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
→ 타입 캐스팅 또는 인터페이스 수정

TS7006: Parameter 'x' implicitly has an 'any' type
→ 명시적 타입 선언 추가
```

### Python Errors
```
ModuleNotFoundError: No module named 'x'
→ 의존성 설치: uv add x

ImportError: cannot import name 'X' from 'Y'
→ 임포트 경로 확인

TypeError: X() got an unexpected keyword argument 'y'
→ 함수 시그니처 확인
```

### ESLint Errors
```
'x' is defined but never used
→ 사용하지 않는 변수 제거 또는 _ 접두사

React Hook useEffect has a missing dependency
→ 의존성 배열 업데이트
```

## Output Format

```markdown
## Build Fix Report

### Errors Found
1. [파일:라인] [오류 메시지]
   - 원인: [원인 분석]
   - 수정: [수정 방안]

### Applied Fixes
- [수정 1]
- [수정 2]

### Verification
✅ Build successful / ❌ Build failed (remaining issues)
```
