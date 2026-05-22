# Deep Research: 스노우볼 프로젝트 프로덕션 배포 전략

## Executive Summary (수정됨)

스노우볼 프로젝트는 **전통적인 백엔드 아키텍처**(FastAPI + SQLModel + Clean Architecture)로 설계되었으므로, **AWS EC2 또는 Hetzner VPS** 배포가 가장 적합합니다. 초기에는 **비용 무료화**에 집중하여 Supabase + Vercel을 검토했으나, **아키텍처 적합성**을 우선시하면 기존 코드를 그대로 배포할 수 있는 VPS/EC2가 더 현명한 선택입니다.

**최종 권장**:
1. **학습/초기 단계**: AWS EC2 Free Tier (12개월 무료)
2. **장기 운영**: Hetzner VPS ($4-5/월) 또는 EC2 유료 전환 ($6-8/월)

Supabase는 **Supabase 기반으로 처음부터 개발하는 프로젝트**에 최적화되어 있으며, 이미 전통적 백엔드가 있는 경우 오히려 복잡도만 증가시킵니다.

---

## Table of Contents

1. [VPS란 무엇인가](#vps란-무엇인가)
2. [Supabase의 실제 활용 방식](#supabase의-실제-활용-방식)
3. [아키텍처 적합성 분석](#아키텍처-적합성-분석)
4. [배포 옵션 상세 분석](#배포-옵션-상세-분석)
5. [수정된 최종 권장사항](#수정된-최종-권장사항)

---

## VPS란 무엇인가

### Virtual Private Server (가상 사설 서버)

**쉬운 비유**:
```
물리 서버 (진짜 컴퓨터 1대)
    ↓ 가상화 기술로 분할
┌─────────┬─────────┬─────────┬─────────┐
│ VPS #1  │ VPS #2  │ VPS #3  │ VPS #4  │
│ (당신)  │ (다른   │ (다른   │ (다른   │
│         │  사람)  │  사람)  │  사람)  │
└─────────┴─────────┴─────────┴─────────┘

= 아파트 건물에서 한 호실 임대
```

### VPS vs 기타 호스팅

| 호스팅 유형 | 비유 | 가격 | 제어권 | 적합한 용도 |
|------------|------|------|--------|------------|
| **공유 호스팅** | 하숙집 (방 공유) | $3/월 | 낮음 | 단순 블로그 |
| **VPS** | 오피스텔 (독립 공간) | $4-20/월 | 높음 | 풀스택 앱 |
| **전용 서버** | 단독 주택 | $50-200/월 | 최고 | 대규모 트래픽 |
| **클라우드** | 고급 빌딩 | 사용량 기반 | 높음 | 가변 트래픽 |

### VPS의 장점

**✅ 완전한 제어권**:
```bash
# Root 권한으로 뭐든 설치 가능
sudo apt install docker postgresql nginx
```

**✅ 전용 자원**:
```
할당받은 자원 (독점):
- CPU: 1 core
- RAM: 2GB
- Disk: 20GB SSD

→ 다른 사용자 영향 없음
```

**✅ 예측 가능한 비용**:
```
Hetzner VPS: €4.09/월 (고정)
- 트래픽 얼마든 동일
- 갑작스런 요금 폭탄 없음
```

**✅ 실무 경험**:
```
VPS 관리 = 실제 서버 관리 학습
- Linux 명령어
- 방화벽 설정
- 서버 보안
- 모니터링
```

### VPS vs VPN (자주 헷갈림!)

| 비교 | VPS | VPN |
|------|-----|-----|
| **풀네임** | Virtual Private **Server** | Virtual Private **Network** |
| **용도** | 웹사이트/앱 **호스팅** | 인터넷 접속 **보안/우회** |
| **예시** | 내 블로그를 VPS에 배포 | 넷플릭스 미국 콘텐츠 보기 |

**VPS**: "내 컴퓨터를 클라우드에 두는 것"
**VPN**: "내 인터넷 트래픽을 암호화하는 것"

---

## Supabase의 실제 활용 방식

많은 개발자들이 Supabase를 **백엔드 코드 없이** 사용한다는 점을 처음 분석에서 누락했습니다. 이 부분을 명확히 합니다.

### 1. PostgREST 자동 API 생성

- **확신도**: [Confirmed]
- **출처**: [Auto-generated REST API via PostgREST](https://supabase.com/features/auto-generated-rest-api)

**핵심 기능**:
```
데이터베이스 테이블 생성
        ↓
Supabase가 자동으로 REST API 생성
        ↓
프론트엔드에서 직접 API 호출
```

**예시**:
```javascript
// 테이블: assets (ticker, quantity, target_ratio)
// Supabase가 자동으로 다음 API 생성:

// GET /rest/v1/assets
const { data } = await supabase
  .from('assets')
  .select('*')

// POST /rest/v1/assets
const { data } = await supabase
  .from('assets')
  .insert({ ticker: 'SPY', quantity: 10 })

// 별도의 FastAPI 백엔드 불필요!
```

### 2. Row Level Security (RLS)

- **확신도**: [Confirmed]
- **출처**: [Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

**프론트엔드에서 직접 DB 접근해도 안전한 이유**:
```sql
-- RLS 활성화
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 계좌의 자산만 조회 가능
CREATE POLICY "Users can view own assets"
ON assets FOR SELECT
USING (auth.uid() = user_id);
```

**⚠️ 중요 경고**:
- 2025년 1월: 170개 이상의 앱이 RLS 미설정으로 데이터 노출 (CVE-2025-48757)
- 83%의 Supabase 보안 사고가 RLS 설정 누락

### 3. 백엔드 없는 풀스택 개발 패턴

- **확신도**: [Confirmed]
- **출처**: [Ditch the Backend: Build Full-Stack App Using Only Supabase & React](https://dev.to/ekwoster/ditch-the-backend-build-a-full-stack-web-app-using-only-supabase-react-no-nodejs-needed-alg)

**개발 패턴**:
```
React/Next.js Frontend
        ↓
Supabase Client SDK
        ↓
Supabase Auto-generated APIs
        ↓
PostgreSQL Database (with RLS)
```

**한국 사례**:
> "프론트엔드에서 데이터베이스 쿼리를 필요에 맞게 직접 작성해서 실행할 수 있기 때문에, **단순 CRUD를 위해 백엔드에서 별도의 API를 만들 필요가 전혀 없습니다**."
>
> "현재는 **백엔드 개발자 없이** 서비스를 개발하기로 결정했습니다."

---

## 아키텍처 적합성 분석

### 스노우볼 프로젝트의 현재 아키텍처

```python
✅ FastAPI (전통적 백엔드 프레임워크)
✅ SQLModel/SQLAlchemy (ORM)
✅ Clean Architecture + DDD
✅ Domain Services, Use Cases, Value Objects
✅ 표준 PostgreSQL 설계

# 예시: 복잡한 비즈니스 로직
class RebalancingService:
    def calculate(self, assets: list[Asset], cash: Money):
        # 리밸런싱 알고리즘
        # Decimal 정밀도 계산
        # Value Object 활용
```

### Supabase를 사용할 경우

**Option A: Supabase-Only (대규모 리팩토링)**
```
❌ Python 비즈니스 로직 → PostgreSQL Functions로 이동
❌ Domain Services 제거
❌ Value Objects 제거
❌ Clean Architecture 포기
❌ 기존 테스트 코드 대부분 폐기

→ 프로젝트를 처음부터 다시 작성하는 것과 동일
```

**Option B: Supabase를 단순 PostgreSQL로만 사용**
```
✅ FastAPI 백엔드 유지
✅ Supabase를 DB 호스팅으로만 사용

하지만:
❌ PostgREST 자동 API → 사용 안 함
❌ RLS → FastAPI에서 권한 검증
❌ Real-time → 필요 없음
❌ Edge Functions → FastAPI가 대신함

→ "무료 PostgreSQL 호스팅"을 위해 복잡도만 증가
→ Supabase의 핵심 가치를 활용하지 못함
```

### VPS/EC2를 사용할 경우

```bash
✅ 기존 코드 그대로 배포 (Docker Compose)
✅ 아키텍처 일관성 유지
✅ 개발 환경 = 프로덕션 환경
✅ 마이그레이션 불필요

# 배포
docker-compose up -d
# 끝!
```

### 결론: "Architecture-First, Cost-Second"

| 기준 | Supabase-Only | Supabase (DB만) | VPS/EC2 |
|------|--------------|----------------|---------|
| **리팩토링** | 대규모 | 최소 | 없음 |
| **아키텍처 일관성** | ❌ | ⚠️ | ✅ |
| **Supabase 기능 활용** | ✅ | ❌ | N/A |
| **초기 비용** | $0 | $0 | $0-5 |
| **적합성** | 불일치 | 오버엔지니어링 | **최적** |

**Supabase는 훌륭한 서비스이지만, "Supabase 기반으로 처음부터 설계한 앱"에 적합합니다.**

---

## 배포 옵션 상세 분석

### 1. AWS EC2 (★ 권장 - 학습/초기)

- **확신도**: [Confirmed]
- **출처**: [Deploy FastAPI and PostgreSQL on AWS EC2](https://appliku.com/post/deploy-fastapi-and-postgresql-aws-ec2-tutorial/)

**최소 사양**:
- **인스턴스**: t4g.micro (1 vCPU, 1GB RAM, ARM 기반)
- **스토리지**: 30GB gp3 SSD
- **비용**:
  - 첫 12개월: **$0** (Free Tier)
  - 13개월~: **$6-8/월**

**배포 방법**:
```bash
# 1. EC2 인스턴스 생성 (t4g.micro)
# 2. Docker & Docker Compose 설치
sudo apt update && sudo apt install docker.io docker-compose

# 3. 코드 배포
git clone https://github.com/your/snowball
cd snowball

# 4. 실행
docker-compose up -d

# 완료! 기존 코드 그대로 동작
```

**장점**:
- ✅ **첫 해 무료** (학습 비용 제로)
- ✅ **제로 리팩토링** (기존 코드 그대로)
- ✅ **AWS 생태계** (나중에 RDS, S3 등 확장 가능)
- ✅ **실무 경험** (실제 클라우드 운영 학습)

**단점**:
- ⚠️ Free Tier 종료 후 Hetzner보다 비쌈
- ⚠️ 수동 관리 필요

---

### 2. Hetzner VPS (★ 권장 - 장기)

- **확신도**: [Confirmed]
- **출처**: [DigitalOcean vs Hetzner](https://www.digitalocean.com/resources/articles/digitalocean-vs-hetzner)

**최소 사양**:
- **CX11**: 1 vCPU, 2GB RAM, 20GB SSD
- **비용**: **€4.09/월** (~$4.5)

**배포 구성**:
```bash
VPS
├── Docker Compose
│   ├── PostgreSQL (Container)
│   ├── FastAPI Backend (Container)
│   └── Next.js Frontend (Container)
└── Nginx (Reverse Proxy)
```

**장점**:
- ✅ **최저 비용** ($4-5/월 고정)
- ✅ **가격 대비 성능 최고** (RAM 2GB @ $4.5)
- ✅ **완전한 제어권**
- ✅ **예측 가능한 비용**

**단점**:
- ⚠️ 수동 설정 필요 (초기 2-3시간)
- ⚠️ DevOps 지식 필요

**대안**: DigitalOcean ($6/월) - UI/문서가 더 초보자 친화적

---

### 3. Vercel (Frontend) + Render (Backend + DB)

**구조**:
```
Next.js → Vercel (무료)
FastAPI + PostgreSQL → Render ($0 or $7/월)
```

**Render Free Tier**:
- PostgreSQL: 1GB (무료)
- Web Service: 750시간/월 (무료)
- ⚠️ 15분 비활성 시 sleep

**장점**:
- ✅ 프론트엔드 Vercel CDN 활용
- ✅ 백엔드 관리형
- ✅ 기존 코드 거의 그대로

**단점**:
- ⚠️ Free Tier는 첫 요청 느림 (sleep에서 깨어남)
- ⚠️ 프로덕션용은 유료 ($7/월~)

---

### 4. Vercel + Supabase (권장하지 않음)

- **확신도**: [Confirmed]
- **출처**: [Building a Supabase and FastAPI Project](https://medium.com/@abhik12295/building-a-supabase-and-fastapi-project-a-modern-backend-stack-52030ca54ddf)

**아키텍처**:
```
Next.js Frontend (Vercel)
        ↓
FastAPI Backend (Vercel Serverless)
        ↓
Supabase PostgreSQL
```

**비용**:
- Vercel Free Tier: $0
- Supabase Free Tier: $0
- **총 비용**: **$0/월**

**왜 권장하지 않는가?**:
```
Supabase의 핵심 기능:
- PostgREST 자동 API ❌ FastAPI가 대신함
- RLS 보안 ❌ FastAPI에서 검증
- Real-time ❌ 필요 없음
- Edge Functions ❌ FastAPI가 있음

→ 단순 "무료 PostgreSQL 호스팅"
→ 아키텍처 복잡도만 증가
→ VPS가 더 단순하고 정직함
```

**Supabase는 언제 써야 하나?**:
```
✅ 처음부터 Supabase 기반으로 설계
✅ 백엔드 코드 최소화 목표
✅ PostgREST, RLS 적극 활용
✅ Real-time 기능 필요

예: 간단한 CRUD 앱, 프로토타입, 스타트업 MVP
```

---

### 5. AWS Lambda + RDS (비추천)

- **확신도**: [Confirmed]
- **출처**: [FastAPI Lambda Container 2026](https://rafrasenberg.com/fastapi-lambda/)

**구성**:
- Lambda (FastAPI + Mangum): ~$0-5/월
- RDS db.t3.micro: ~$30/월
- **총 비용**: **~$35-40/월**

**결론**: 소규모 앱에는 과도하게 비쌈.

---

### 6. 도메인 옵션

- **확신도**: [Likely]
- **출처**: [Custom domains on Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/)

**무료 도메인**: 없음

**저렴한 구매처**:
- **Cloudflare Registrar**: ~$9-12/년 (.com)
- **Namecheap**: ~$10-13/년
- **Porkbun**: ~$9-11/년

**무료 서브도메인**:
- Vercel: `your-app.vercel.app`
- EC2: 퍼블릭 IP 사용 (도메인 없이)

---

## 수정된 최종 권장사항

### 🏆 1순위: AWS EC2 (Free Tier 1년) → Hetzner VPS

**단계별 경로**:
```
1. 지금 (학습/개발):
   → AWS EC2 Free Tier (12개월 무료)
   → 기존 Docker Compose 그대로 배포

2. Free Tier 종료 후:
   → Hetzner VPS (€4.09/월)
   또는 EC2 계속 ($6-8/월)

3. 트래픽 증가 시:
   → EC2 스케일업 또는 로드밸런서 추가
```

**마이그레이션 단계**:
```bash
# AWS EC2 배포
1. EC2 t4g.micro 인스턴스 생성
2. SSH 접속: ssh -i key.pem ubuntu@ec2-ip
3. Docker 설치: sudo apt install docker.io docker-compose
4. 코드 배포: git clone && cd snowball
5. 실행: docker-compose up -d
6. 도메인 연결 (선택): Route53 또는 Cloudflare

# Hetzner 배포 (동일한 과정)
```

**비용 예측**:
```
12개월: $0 (AWS Free Tier)
13-24개월: $48-96 (Hetzner €4.09 × 12개월)
25개월~: 계속 $4-5/월

vs Supabase+Vercel:
- 무료 티어 초과 시: $45/월
- 연간: $540

→ VPS가 장기적으로 더 저렴
```

**장점 요약**:
- ✅ **제로 리팩토링** (기존 코드 그대로)
- ✅ **아키텍처 일관성** (개발 환경 = 프로덕션)
- ✅ **완전한 제어** (원하는 대로 커스터마이징)
- ✅ **실무 경험** (실제 운영 환경 관리 학습)
- ✅ **확장 용이** (나중에 서버 증설 가능)
- ✅ **예측 가능한 비용**

**단점**:
- ⚠️ 수동 관리 필요 (보안 패치, 모니터링)
- ⚠️ 월 $5-8 비용 (하지만 가치 있음)

---

### 2순위: Vercel (Frontend) + Render (Backend + DB)

프론트엔드만 CDN 활용하고 싶다면:

**구조**:
```
Next.js → Vercel (무료, CDN)
FastAPI + PostgreSQL → Render ($7/월)
```

**비용**: $7/월 (프로덕션용)

---

### ~~3순위: Supabase + Vercel~~ (스노우볼에 비추천)

**이유**:
- Supabase의 핵심 기능을 활용하지 못함
- "무료 PostgreSQL"을 위해 복잡도만 증가
- VPS가 더 단순하고 정직함

**Supabase는 언제 쓰나?**:
- 처음부터 Supabase 기반으로 설계
- PostgREST, RLS 적극 활용
- 백엔드 코드 최소화

---

## 비용 vs 가치 비교 (수정됨)

| 옵션 | 월 비용 | 마이그레이션 | 아키텍처 적합성 | 학습 가치 | 추천 |
|------|---------|--------------|-----------------|-----------|------|
| **EC2** | $0 (1년) → $6-8 | 없음 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **★★★★★** |
| **Hetzner VPS** | $4-5 | 없음 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **★★★★★** |
| **Render** | $0 → $7 | 최소 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **★★★☆☆** |
| Vercel + Supabase | $0 → $45 | 중간 | ⭐⭐ | ⭐⭐ | **★☆☆☆☆** |
| AWS Lambda + RDS | $35-40 | 중간 | ⭐⭐ | ⭐⭐⭐ | **☆☆☆☆☆** |

---

## Edge Cases & Caveats

### VPS 관리 부담

- **시나리오**: 서버 보안 패치, 모니터링 직접 수행
- **영향**: 시간 투자 필요 (주 1-2시간)
- **해결**:
  ```bash
  # 자동 보안 업데이트
  sudo apt install unattended-upgrades

  # 간단한 모니터링
  htop, docker stats
  ```

### Supabase RLS 설정 실수

- **시나리오**: RLS 미설정 시 모든 데이터 노출
- **영향**: 심각한 보안 사고 (CVE-2025-48757)
- **해결**: RLS 필수 활성화, 정책 철저히 테스트

### Vercel 서버리스 제약

- **실행 시간 제한**: Free 10초, Pro 60초
- **Cold Start**: 첫 요청 1-2초 지연

---

## Supabase 상세 분석 (참고용)

Supabase를 **나중에** 처음부터 새 프로젝트로 개발할 때를 위한 정보입니다.

### 제공 기능

1. **PostgreSQL Database**: 완전한 PostgreSQL
2. **PostgREST**: 자동 REST API 생성
3. **Authentication**: JWT 기반 인증 (50K MAU 무료)
4. **Storage**: 파일 스토리지 (1GB 무료)
5. **Edge Functions**: 서버리스 함수
6. **Real-time**: WebSocket 구독

### 가격 (참고)

- **Free**: $0/월 (500MB DB, 50K MAUs)
- **Pro**: $25/월 (8GB DB, 100K MAUs)

### 초과 요금

- MAU: $0.00325/MAU
- DB Storage: $0.125/GB
- Egress: $0.09/GB

---

## Contradictions Found

### AWS Lambda + RDS 비용 효율성

- **모순**: 일부 자료는 Lambda + Aurora Serverless가 저렴하다고 주장
- **실제**: 최소 $43/월 발생
- **해결**: 중대형 앱에만 적합 — [Confirmed]

### Fly.io Free Tier

- **모순**: 과거 무료 티어 존재
- **현재**: 신규 조직에 미제공, $5 크레딧만
- **해결**: Legacy 사용자만 유지 — [Confirmed]

---

## Sources

1. [Ultimate Guide to Deploying Next.js, FastAPI, and PostgreSQL 2025](https://medium.com/@zafarobad/ultimate-guide-to-deploying-next-js-d57ab72f6ba6)
2. [FastAPI on Vercel Official Docs](https://vercel.com/docs/frameworks/backend/fastapi)
3. [FastAPI Lambda Container 2026](https://rafrasenberg.com/fastapi-lambda/)
4. [Supabase vs AWS Pricing 2025](https://www.bytebase.com/blog/supabase-vs-aws-pricing/)
5. [Supabase Review 2026](https://hackceleration.com/supabase-review/)
6. [Supabase Official Pricing](https://supabase.com/pricing)
7. [Building a Supabase and FastAPI Project](https://medium.com/@abhik12295/building-a-supabase-and-fastapi-project-a-modern-backend-stack-52030ca54ddf)
8. [Top 10 Low-Cost VPS Providers 2026](https://www.nucamp.co/blog/top-10-low-cost-vps-providers-in-2026-affordable-alternatives-to-aws-azure-gcp-and-vercel)
9. [DigitalOcean vs Hetzner](https://www.digitalocean.com/resources/articles/digitalocean-vs-hetzner)
10. [AWS Lambda RDS Proxy Pricing](https://aws.amazon.com/rds/proxy/pricing/)
11. [Aurora Serverless v2 Minimum Cost](https://repost.aws/questions/QUbtHMLZXiS4Kppi7KMIB5YQ/aurora-serverless-v2-minimum-cost-setup-for-development-environment)
12. [Vercel Pricing 2026](https://vercel.com/pricing)
13. [Fly.io Pricing 2026](https://fly.io/pricing/)
14. [Auto-generated REST API via PostgREST - Supabase](https://supabase.com/features/auto-generated-rest-api)
15. [Row Level Security - Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
16. [Ditch the Backend: Build Full-Stack App Using Only Supabase & React](https://dev.to/ekwoster/ditch-the-backend-build-a-full-stack-web-app-using-only-supabase-react-no-nodejs-needed-alg)
17. [Supabase RLS Complete Guide 2026](https://vibeappscanner.com/supabase-row-level-security)
18. [Supabase란 무엇인가? - TILNOTE](https://tilnote.io/en/pages/66dd43f58f594ac62be23bd9)
19. [백엔드 서버 코딩없이 구현하기](https://maily.so/nocoder/posts/mjz65kqnrwk)

---

## Research Metadata

- **검색 쿼리 수**: 17 (일반 16 + SNS 1)
- **수집 출처 수**: 19
- **출처 유형 분포**: 공식 문서 5, 기술 블로그 11, 커뮤니티 3
- **확신도 분포**: Confirmed 10, Likely 1
- **주요 수정 사항**:
  - 아키텍처 적합성 분석 추가
  - VPS 개념 설명 추가
  - Supabase 실제 활용 방식 추가
  - 최종 권장사항 EC2/VPS로 변경
  - 비용보다 아키텍처 우선 원칙 적용
