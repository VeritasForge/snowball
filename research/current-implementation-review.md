# 스노우볼 현재 구현 검토 및 분석

작성일: 2026-02-16
검토 범위: Frontend (Next.js/React), Backend (Python/FastAPI)

---

## ⚠️ Executive Summary

**중대한 발견**: 현재 구현은 "추천만 제공" 전략과 **완전히 위배**됩니다.
- ❌ 자동 매매 기능이 완전히 구현되어 있음
- ❌ 면책 문구 없음
- ⚠️ 투자 권유 가능성 있는 UI/문구

**즉시 조치 필요**: 1인 개발자에게 법적 위험이 높습니다.

---

## 1. 현재 구현 현황

### Frontend (frontend/src/app/page.tsx)

#### 자동 매매 기능 구현 확인 ✅ (문제)

**`executeTrade` 함수** (152-192줄):
```typescript
const executeTrade = async (asset: Asset) => {
    try {
        const res = await fetch("http://localhost:8000/api/v1/assets/execute", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                asset_id: asset.id,
                action_quantity: asset.action_quantity,
                price: asset.current_price
            })
        });

        if (res.ok) {
            const action = asset.action_quantity > 0 ? '매수' : '매도';
            showToast(`${asset.name} ${Math.abs(asset.action_quantity)}주 ${action} 체결 완료!`);
            await fetchAccounts(); // 데이터 새로고침
        }
    } catch (e) {
        showToast("체결 중 오류가 발생했습니다.", 'error');
    }
}
```

**매수/매도 버튼** (486-503줄):
```typescript
<button
    onClick={() => setExecuteConfirmId(item.id!)}
    className={`${item.action_quantity > 0
        ? 'bg-danger text-white hover:bg-danger/80'  // 매수 버튼
        : 'bg-primary text-white hover:bg-primary/80'}`}  // 매도 버튼
>
    <PlayCircle size={12} />
    {item.action_quantity > 0 ? '매수' : '매도'} {Math.abs(item.action_quantity)}주
</button>
```

**문제점**:
1. 실제 매매를 실행하는 API 호출
2. "체결 완료" 메시지 표시
3. 사용자가 버튼 클릭만으로 즉시 매매 가능

### Backend (backend/src/snowball/use_cases/trade.py)

**`ExecuteTradeUseCase`** (전체 파일):
```python
class ExecuteTradeUseCase:
    def execute(self, asset_id: int, action_quantity: int, price: float):
        # 1. 자산 및 계좌 조회
        asset = self.asset_repo.get(asset_id)
        account = self.account_repo.get(asset.account_id)

        # 2. 매수/매도 처리
        total_amount = abs(action_quantity) * price

        if action_quantity > 0:  # 매수
            if account.cash < total_amount:
                raise InsufficientFundsException(...)
            account.cash -= total_amount
        else:  # 매도
            account.cash += total_amount

        # 3. 수량 및 평단가 업데이트
        asset.quantity = new_qty
        asset.avg_price = ... # 평단가 재계산

        # 4. DB 저장
        self.account_repo.save(account)
        self.asset_repo.save(asset)
```

**API 엔드포인트**: `POST /api/v1/assets/execute` (routes.py 추정)

**문제점**:
1. 완전한 매매 실행 로직 (계좌 잔고 차감/증가)
2. 수량 및 평단가 자동 업데이트
3. DB에 실제 반영

---

## 2. 빠진 부분 (Missing)

### 필수 추가 사항

| 항목 | 현재 상태 | 필요 사항 | 우선순위 |
|------|-----------|----------|---------|
| **면책 문구** | ❌ 없음 | 모든 페이지에 표시 필수 | 🔴 긴급 |
| **투자 유의사항** | ❌ 없음 | 약관 동의 모달 필수 | 🔴 긴급 |
| **MTS 딥링크** | ❌ 없음 | 증권사 앱 연결 기능 | 🟡 중간 |
| **리밸런싱 체크리스트** | ❌ 없음 | 완료 여부 추적 UI | 🟢 낮음 |
| **클립보드 복사** | ❌ 없음 | 매매 정보 복사 기능 | 🟢 낮음 |
| **푸시 알림** | ❌ 없음 | 카카오톡 알림톡 | 🟡 중간 |

### 면책 문구 예시 (즉시 추가 필요)

```tsx
// frontend/src/components/DisclaimerBanner.tsx
export function DisclaimerBanner() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <AlertTriangle className="text-yellow-400" size={20} />
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong>투자 유의사항</strong>
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            • 본 서비스는 투자 조언이 아닌 <strong>참고 정보</strong>를 제공합니다.<br/>
            • 최종 투자 결정은 <strong>이용자 본인의 책임</strong>입니다.<br/>
            • 투자 결과에 대해 스노우볼은 책임지지 않습니다.<br/>
            • 투자에는 <strong>손실 위험</strong>이 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. 채워야 할 부분 (To Add)

### Phase 1: 긴급 조치 (1주 내)

#### A. 자동 매매 기능 제거 또는 비활성화

**옵션 1: 완전 제거 (권장)**
```typescript
// frontend/src/app/page.tsx

// ❌ 제거: executeTrade 함수 (152-192줄)
// ❌ 제거: 매수/매도 버튼 (486-503줄)

// ✅ 추가: MTS 연결 안내
<div className="text-center p-4 bg-primary/10 rounded-lg">
  <p className="text-sm text-muted mb-2">
    매매는 증권사 MTS/HTS에서 직접 실행해주세요
  </p>
  <button
    onClick={() => copyToClipboard(asset)}
    className="text-xs text-primary underline"
  >
    매매 정보 복사
  </button>
</div>
```

**Backend API 제거**:
```python
# backend/src/snowball/adapters/api/routes.py
# ❌ 제거: @router.post("/assets/execute") 엔드포인트
```

**옵션 2: 일시 비활성화 (임시)**
```typescript
// 모든 executeTrade 호출에 경고 추가
const executeTrade = async (asset: Asset) => {
    alert("⚠️ 매매 기능은 현재 서비스 개선을 위해 일시 중단되었습니다.\n증권사 MTS를 이용해주세요.");
    return;
    // ... 기존 코드 주석 처리
};
```

#### B. 면책 문구 추가

**위치 1: Header (모든 페이지)**
```tsx
// frontend/src/components/Header.tsx
<div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
  <p className="text-xs text-center text-yellow-800">
    ⚠️ 본 서비스는 투자 조언이 아닌 참고 정보를 제공합니다.
    투자 결정 및 결과는 이용자 본인의 책임입니다.
  </p>
</div>
```

**위치 2: 약관 동의 모달 (첫 방문 시)**
```tsx
// frontend/src/components/DisclaimerModal.tsx
export function DisclaimerModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl max-w-md">
        <h2 className="text-xl font-bold mb-4">투자 유의사항</h2>
        <div className="text-sm space-y-2 mb-6">
          <p>1. 본 서비스는 투자 조언이 아닌 <strong>참고 정보</strong>입니다.</p>
          <p>2. 최종 투자 결정은 <strong>이용자 본인의 책임</strong>입니다.</p>
          <p>3. 투자 손실에 대해 스노우볼은 <strong>책임지지 않습니다</strong>.</p>
          <p>4. 투자에는 원금 손실 위험이 있습니다.</p>
        </div>
        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" required />
          <span className="text-xs">위 내용을 확인했으며 동의합니다.</span>
        </label>
        <button
          onClick={onAccept}
          className="w-full bg-primary text-white py-3 rounded-lg"
        >
          확인
        </button>
      </div>
    </div>
  );
}
```

#### C. 투자 권유 문구 수정

**현재 문구** (page.tsx:347-348):
```
❌ "매수/매도 버튼 클릭 시 계좌 예수금과 평단가가 실제 반영됩니다."
```

**수정 후**:
```
✅ "리밸런싱 필요 수량을 확인하고, 증권사 MTS에서 직접 매매하세요."
```

**현재 문구** (page.tsx:383):
```
❌ "리밸런싱 매매"
```

**수정 후**:
```
✅ "리밸런싱 필요 수량"
```

### Phase 2: UX 개선 (1개월 내)

#### A. MTS 딥링크 구현

```typescript
// frontend/src/lib/deeplink.ts
export const deeplinks = {
  kiwoom: (code: string, qty: number, type: 'buy' | 'sell') =>
    `kiwoom://order?code=${code}&qty=${qty}&type=${type}`,

  kis: (code: string, qty: number, type: 'buy' | 'sell') =>
    `shinhan://order?code=${code}&qty=${qty}&type=${type}`,
};

export function openMTS(broker: string, asset: Asset) {
  const type = asset.action_quantity > 0 ? 'buy' : 'sell';
  const deepLink = deeplinks[broker](asset.code, Math.abs(asset.action_quantity), type);

  window.location.href = deepLink;

  // Fallback: 앱이 없으면 웹 주문 페이지로
  setTimeout(() => {
    window.open(`https://...증권사주문페이지`, '_blank');
  }, 1000);
}
```

#### B. 리밸런싱 체크리스트

```tsx
// frontend/src/components/RebalancingChecklist.tsx
export function RebalancingChecklist({ assets }: { assets: Asset[] }) {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const needsRebalancing = assets.filter(a => a.action_quantity !== 0);

  return (
    <div className="bg-card rounded-xl p-6 border">
      <h3 className="font-bold text-lg mb-4">
        📋 오늘의 리밸런싱 ({needsRebalancing.length}건)
      </h3>
      <div className="space-y-3">
        {needsRebalancing.map(asset => (
          <label key={asset.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <input
              type="checkbox"
              checked={completed.has(asset.id)}
              onChange={() => {
                const newSet = new Set(completed);
                if (newSet.has(asset.id)) {
                  newSet.delete(asset.id);
                } else {
                  newSet.add(asset.id);
                }
                setCompleted(newSet);
              }}
            />
            <div className="flex-1">
              <p className="font-medium">{asset.name} ({asset.code})</p>
              <p className="text-xs text-muted">
                {asset.action_quantity > 0 ? '매수' : '매도'} {Math.abs(asset.action_quantity)}주
                (약 {formatNumber(Math.abs(asset.action_quantity) * asset.current_price)}원)
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(asset)}
              className="text-xs text-primary underline"
            >
              복사
            </button>
          </label>
        ))}
      </div>
      {completed.size === needsRebalancing.length && (
        <div className="mt-4 p-3 bg-success/10 text-success rounded-lg text-center">
          ✓ 모든 리밸런싱 완료!
        </div>
      )}
    </div>
  );
}
```

#### C. 클립보드 복사 기능

```typescript
// frontend/src/lib/clipboard.ts
export function copyRebalancingInfo(asset: Asset) {
  const type = asset.action_quantity > 0 ? '매수' : '매도';
  const text = `
${asset.name} (${asset.code})
${type} ${Math.abs(asset.action_quantity)}주
예상 금액: ${formatNumber(Math.abs(asset.action_quantity) * asset.current_price)}원
시장가 주문 권장
  `.trim();

  navigator.clipboard.writeText(text);
  toast.success('복사되었습니다! MTS에서 붙여넣기 하세요');
}
```

### Phase 3: 푸시 알림 (2개월 내)

**Task #7에서 별도 조사 예정** (카카오톡 알림톡)

---

## 4. 위배되는 부분 (Violations)

### 법적 위험 분석

| 위반 사항 | 현재 상태 | 법적 위험도 | 조치 |
|----------|-----------|------------|------|
| **투자일임업 무등록 영업** | ❌ 자동 매매 기능 존재 | 🔴 매우 높음 | 즉시 제거 |
| **투자 권유 (무허가)** | ⚠️ "매수/매도" 버튼 | 🔴 높음 | 문구 수정 |
| **면책 조항 부재** | ❌ 없음 | 🟡 중간 | 즉시 추가 |
| **개인정보 수집 (토큰)** | ⚠️ localStorage 저장 | 🟢 낮음 | 암호화 권장 |

### 구체적 위반 내용

#### 1. 투자일임업 무등록 영업 (금융위원회법 위반)

**근거 법령**: 자본시장법 제12조 (투자일임업 등록)

**위반 사항**:
- 사용자의 계좌에서 **직접 매매 실행**
- "체결 완료" 메시지 → 실제 거래 발생
- 사용자 승인만으로 즉시 체결

**형벌**: 5년 이하 징역 또는 2억원 이하 벌금

#### 2. 투자 권유 (무허가)

**근거 법령**: 자본시장법 제51조 (투자권유 금지)

**위반 사항**:
- "매수/매도" 버튼 → 특정 행동 유도
- "리밸런싱 매매" 문구 → 매매 권유
- "체결 완료" → 거래 실행 확인

**형벌**: 3년 이하 징역 또는 1억원 이하 벌금

#### 3. 면책 조항 부재

**근거 법령**: 전자금융거래법 제21조 (면책사유)

**위반 사항**:
- 어떤 페이지에도 투자 유의사항 없음
- 약관 동의 절차 없음
- 책임 범위 불명확

**민사 책임**: 투자 손실 발생 시 손해배상 청구 가능성

---

## 5. 개인정보 수집 현황

### 현재 수집 정보

| 항목 | 저장 위치 | 민감도 | 문제 여부 |
|------|-----------|--------|---------|
| **토큰 (JWT)** | localStorage | 중간 | ⚠️ 암호화 권장 |
| **계좌명** | DB | 낮음 | ✅ OK |
| **보유 종목/수량** | DB | 중간 | ✅ OK |
| **현재가/평단가** | DB | 낮음 | ✅ OK |

### ✅ 수집하지 않는 정보 (양호)

- 주민등록번호 ✅
- 계좌번호 ✅
- 증권사 비밀번호 ✅
- 카드 정보 ✅

### ⚠️ 개선 권장 사항

**토큰 암호화**:
```typescript
// frontend/src/lib/auth.ts
import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY!;

export function saveToken(token: string) {
  const encrypted = CryptoJS.AES.encrypt(token, SECRET_KEY).toString();
  localStorage.setItem('token', encrypted);
}

export function getToken(): string | null {
  const encrypted = localStorage.getItem('token');
  if (!encrypted) return null;

  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

---

## 6. 권장 조치 순서

### 🔴 긴급 (즉시 - 1주)

1. ✅ **자동 매매 기능 제거**
   - Frontend: `executeTrade` 함수 제거
   - Frontend: 매수/매도 버튼 제거
   - Backend: `/assets/execute` API 제거

2. ✅ **면책 문구 추가**
   - Header에 경고 배너
   - 첫 방문 시 약관 동의 모달

3. ✅ **투자 권유 문구 수정**
   - "매수/매도" → "참고 정보"
   - "리밸런싱 매매" → "리밸런싱 필요 수량"

### 🟡 중요 (1개월)

4. ✅ **MTS 딥링크 구현**
   - 증권사 앱 연결
   - 종목 코드 자동 입력

5. ✅ **리밸런싱 체크리스트**
   - 완료 여부 추적
   - 클립보드 복사

6. ✅ **서비스 약관 작성**
   - 변호사 검토 (30-50만원)
   - 개인정보처리방침

### 🟢 선택 (2-3개월)

7. ✅ **푸시 알림** (Task #7)
8. ✅ **자산 증가 차트** (Task #8)
9. ✅ **토큰 암호화**
10. ✅ **금융보안원 컨설팅**

---

## 7. 결론

### 현재 상태: 🔴 높은 법적 위험

스노우볼은 현재 **투자일임업 무등록 영업** 상태로, 금융위원회 제재 대상입니다.

### 즉시 조치 필요

1. 자동 매매 기능 **즉시 제거** (이번 주 내)
2. 면책 문구 **즉시 추가** (이번 주 내)
3. 투자 권유 문구 **즉시 수정** (이번 주 내)

### 목표 상태: ✅ "추천만 제공" 전략

- 리밸런싱 **필요 수량만 표시**
- 매매는 **사용자가 MTS에서 직접**
- 명확한 **책임 한계 명시**

### 참고 문서

- [자동 매매 vs 추천 전략 분석](./auto-trading-vs-recommendation-strategy.md)
- [금융보안원 핀테크 평가](https://www.fsec.or.kr/bbs/146)
- [자본시장법 전문](https://www.law.go.kr/)
