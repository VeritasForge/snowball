---
category: security
tags: [idor, 404-unified, rate-limiting, slowapi, mass-assignment, fastapi]
created: 2026-05-29
updated: 2026-05-29
---

# IDOR 방지 + per-user Rate Limiting (Preset API 패턴)

## 문제

사용자 범위 리소스(preset, account)를 다루는 API에서 세 가지 보안 취약점이 동시에 발생할 수 있습니다:

1. **IDOR (Insecure Direct Object Reference)**: 타 사용자의 `preset_id`/`account_id`를 추측해 접근.
2. **Existence oracle**: wrong-owner에 `403`, not-found에 `404`를 주면, 공격자가 응답 코드 차이로 "그 id가 존재하는가"를 알아냄(열거 공격).
3. **Mass-assignment**: 요청 본문에 `user_id`를 끼워 넣어 타인 명의로 리소스를 생성.

추가로 인증된 엔드포인트의 **rate limiting**을 IP 기준으로만 걸면, NAT 뒤 다수 사용자가 한 버킷을 공유(과도 차단)하거나, 한 사용자가 IP를 바꿔 우회합니다.

## 해결책

### 1. 404-unified (wrong-owner = not-found)

not-found와 wrong-owner를 **동일한 예외**로 처리해 응답을 통일 → existence oracle 차단.

```python
# use_cases/presets.py
class PresetNotFoundError(Exception):
    """missing OR wrong-owner — 동일 404로 통일해 preset_id 열거 차단."""

class DeletePresetUseCase:
    def execute(self, *, preset_id: int, current_user: User) -> None:
        preset = self.repo.get(preset_id)
        if preset is None or preset.user_id != current_user.id:  # 두 상태를 한 분기로
            raise PresetNotFoundError(f"Preset {preset_id} not found")
        self.repo.delete(preset_id)
```

```python
# adapters/api/routes.py — 두 예외 모두 404로 매핑
except PresetNotFoundError:
    raise HTTPException(HTTPStatus.NOT_FOUND, "Preset not found")
except AccountNotFoundError:
    raise HTTPException(HTTPStatus.NOT_FOUND, "Account not found")
```

> ⚠️ **기존 코드와의 의도적 divergence**: 레거시 account/asset 라우트는 wrong-owner에 `403 Forbidden`을 반환한다(`routes.py`의 `update_account`/`delete_asset` 등). preset은 신규 hardened 정책으로 **404-unified**를 채택했다. 전체 통일은 별도 마이그레이션(기존 403 단정 e2e 회귀 유발)으로 분리한다.

### 2. Server-derived user_id (mass-assignment 차단)

DTO는 `extra='forbid'`로 미지의 필드를 거부하고, use case는 `user_id`를 **서버에서** 바인딩한다. DTO를 엔티티로 spread하지 않는다.

```python
# DTO
class PresetCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")   # user_id 끼워넣기 → 422
    name: str = Field(min_length=1, max_length=100)
    items: list[PresetItemCreate] = Field(min_length=1, max_length=50)

# use case — user_id는 current_user에서만 온다
def execute(self, *, name, items, current_user: User) -> Preset:
    preset = Preset(name=name, user_id=current_user.id, items=list(items))  # 명시 바인딩
    return self.preset_repo.save(preset)
```

### 3. per-user Rate Limiting (slowapi key_func override)

`slowapi`의 `Limiter`는 IP 기준이 기본이지만, 미들웨어로 `request.state.user_id`를 미리 세팅하고 라우트별 `key_func`를 오버라이드하면 per-user로 제한할 수 있다. slowapi key_func는 FastAPI `Depends()`를 받지 못하므로 미들웨어가 필요하다.

```python
# middleware.py — 가벼운 JWT decode로 request.state.user_id 세팅 (decode 실패는 silently skip)
async def user_id_middleware(request, call_next):
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        payload = JWTService.decode_token(auth[7:].strip())
        if payload and "sub" in payload:
            request.state.user_id = payload["sub"]   # str
    return await call_next(request)

# routes.py — 라우트별 key_func 오버라이드 (slowapi Limiter.limit(key_func=...) 지원)
def user_id_key_func(request: Request) -> str:
    return getattr(request.state, "user_id", None) or get_remote_address(request)  # IP fallback

@router.post("/presets")
@limiter.limit("10/minute", key_func=user_id_key_func)   # @router 위, @limiter 아래; request:Request 첫 인자 필수
def create_preset(request: Request, ...): ...
```

토큰 type 게이트도 함께: `decode_token`은 `payload["type"] == "access"`만 통과시켜 refresh-as-access를 차단한다(rl-verify N1-S).

## 테스트 전략 (dependency-override conftest)

이 프로젝트의 `client` fixture는 `get_current_user`를 **단일 고정 user로 override**한다. 따라서:

- **인증은 override로 제공** → 요청에 실제 토큰/헤더 불필요. `401` 테스트는 이 패턴으로 불가(auth는 `test_auth_routes.py`가 별도 검증).
- **wrong-owner 404 테스트**: `_make_user_client(session, user_id)`로 **다른 user의 클라이언트**를 만들어 리소스를 생성한 뒤, 본 user 클라이언트로 접근 → 404 단정. (override를 테스트 중간에 바꾸지 말고 클라이언트를 분리.)
- **429 결정적 테스트**: 실제 토큰이 없으면 `user_id_key_func`가 IP fallback(`testclient`)으로 수렴해 **모든 테스트가 한 limiter 키를 공유**한다. autouse fixture로 `limiter.reset()`을 매 테스트 앞에 호출해 카운터 누수를 막고, 한 테스트에서 한도+1회 호출로 429를 결정적으로 유발한다.

```python
@pytest.fixture(autouse=True)
def _reset_limiter():
    limiter.reset()       # IP-shared 키 누수 차단
    yield
```

## 적용 위치

- `backend/src/snowball/use_cases/presets.py` — `PresetNotFoundError`/`AccountNotFoundError` 404-unified
- `backend/src/snowball/adapters/api/routes.py` — `user_id_key_func`, 4 preset endpoints
- `backend/src/snowball/adapters/api/middleware.py` — `user_id_middleware`
- `backend/src/snowball/infrastructure/security.py` — `decode_token` type='access' 게이트
- `backend/tests/e2e/test_presets.py` — 404-unified + 429 + 422 e2e

## 관련

- [Decimal 정밀도](../financial/decimal-precision.md)
- 글로벌 보안 규칙: `.claude/rules/security.md` (IDOR 항목은 이 문서의 404-unified로 강화됨)
