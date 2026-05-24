---
tags: [testing, accessibility, aria-label, rtl, react-testing-library]
applies-to: [frontend/tests, frontend/src/components]
---

# CSS 클래스 선택자 → aria-label role query 마이그레이션 패턴

## 문제

CSS 클래스나 DOM 구조에 의존하는 선택자는 brittle test의 원인이 된다:

```typescript
// ❌ 취약한 선택자들
container.querySelector('.bg-danger');
screen.getByRole('button').closest('.delete-confirm');
screen.getAllByRole('button')[0]; // 순서 의존
screen.getByRole('textbox'); // 여러 textbox 존재 시 오류
```

## 해결책: aria-label 추가 + role query

### 소스 코드에 aria-label 추가

```tsx
// Before
<button onClick={onDeleteAsset}>삭제</button>
<button onClick={onCancelDelete}>취소</button>
<button onClick={onStartDelete}>
  <Trash2 />
</button>
<input type="text" value={name} />

// After
<button onClick={onDeleteAsset} aria-label="자산 삭제 확인">삭제</button>
<button onClick={onCancelDelete} aria-label="자산 삭제 취소">취소</button>
<button onClick={onStartDelete} aria-label="자산 삭제">
  <Trash2 />
</button>
<input type="text" value={name} aria-label="계좌명 입력" />
```

### 테스트에서 role query 사용

```typescript
// ✅ 안정적인 role 기반 선택자
await user.click(screen.getByRole('button', { name: '자산 삭제 확인' }));
await user.click(screen.getByRole('button', { name: '자산 삭제 취소' }));
await user.type(screen.getByRole('textbox', { name: '계좌명 입력' }), '새이름');
```

## 동일한 DOM에 여러 textbox가 있는 경우

컴포넌트 내에 여러 `<input>` 이 있을 때:

```typescript
// ❌ 모호함 — "Found multiple elements with the role 'textbox'"
screen.getByRole('textbox');

// ✅ 명확한 선택
screen.getByRole('textbox', { name: '계좌명 입력' });
screen.getByRole('textbox', { name: '현금 입력' });
```

## 아이콘 전용 버튼 네이밍 가이드 (Snowball)

| 버튼 | aria-label |
|------|-----------|
| 삭제 확인 (빨간 체크) | `자산 삭제 확인` |
| 삭제 취소 (X) | `자산 삭제 취소` |
| 삭제 시작 (쓰레기통) | `자산 삭제` |
| 편집 시작 (연필) | `계좌명 편집` |
| 편집 확인 (체크) | `계좌명 변경 확인` |
| 편집 취소 (X) | `계좌명 편집 취소` |
| 종목 검색 (돋보기) | `종목 정보 조회` |
| 토스트 닫기 (X) | `토스트 닫기` |

## 효과

1. **리팩토링 내성**: 클래스명/DOM 구조 변경 시 테스트 영향 없음
2. **접근성 개선**: aria-label은 스크린 리더 사용자에게도 버튼 의미를 전달
3. **테스트 명확성**: 테스트 코드에서 어떤 버튼을 누르는지 즉시 파악 가능
