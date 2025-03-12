# AI 법률 어드바이저

AI 기반 법률 자문 웹 애플리케이션으로, 사용자가 법적 문제를 입력하면 일련의 질문을 통해 상황을 분석하고 적절한 법률 정보와 대응 방안을 제공합니다.

## 프로젝트 개요

AI 법률 어드바이저는 다음과 같은 기능을 제공합니다:

1. **법률 진단 시스템**
   - 사용자가 입력한 문제를 기반으로 추가 질문을 통해 상황 정밀 분석
   - 질문에 따라 사용자의 법적 상황을 카테고리별로 분류
   - 사용자 답변을 바탕으로 적절한 법률 조항 및 법적 절차 안내

2. **법률 검토 및 대응 방안 제공**
   - 사용자 상황에 맞는 관련 법률 정보 제공
   - 법적 대응 가능성 및 절차 안내
   - 유사 사례 및 판례 요약 제공
   - 변호사 상담 필요성 판단 및 안내

3. **법률 대응 전략 추천**
   - 사용자의 법적 문제에 따른 최적의 대응 방안 제시
   - 실무적 가이드 제공 (필요 서류, 법원 제출 절차 등)

## 기술 스택

- **프론트엔드**: Next.js (React), TypeScript, Tailwind CSS
- **상태 관리**: React Hooks (useState, useEffect)
- **라우팅**: Next.js App Router
- **UI 컴포넌트**: 자체 제작 UI 컴포넌트
- **API**: Google Gemini API

## 설치 및 실행 방법

### 필수 사항

- Node.js 18.17.0 이상
- npm 9.6.7 이상
- Google Gemini API 키

### 설치

1. 레포지토리를 클론합니다.
```bash
git clone https://github.com/your-username/legal-advisor.git
cd legal-advisor
```

2. 의존성을 설치합니다.
```bash
npm install
```

3. 환경 변수 설정
   - 프로젝트 루트에 `.env.local` 파일을 생성하고 아래 내용을 추가합니다:
   ```
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```
   - `your_api_key_here` 부분을 실제 Google Gemini API 키로 교체합니다.
   - Google Gemini API 키는 [Google AI Studio](https://ai.google.dev/)에서 발급받을 수 있습니다.

### 개발 서버 실행

```bash
npm run dev
```
- 브라우저에서 http://localhost:3000 으로 접속하여 애플리케이션을 확인할 수 있습니다.

### 프로덕션 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
legal-advisor/
├── public/              # 정적 파일
├── src/                 # 소스 코드
│   ├── app/             # 앱 라우트
│   │   ├── analyze/     # 분석 페이지
│   │   ├── consult/     # 상담 페이지
│   │   ├── result/      # 결과 페이지
│   │   ├── layout.tsx   # 메인 레이아웃
│   │   └── page.tsx     # 홈페이지
│   ├── components/      # 컴포넌트
│   │   └── ui/          # UI 컴포넌트
│   └── lib/             # 유틸리티 함수
└── package.json         # 프로젝트 의존성 및 스크립트
```

## 보안 관련 주의사항

- 이 애플리케이션은 환경 변수를 사용하여 API 키를 관리합니다. `.env.local` 파일은 절대 공개 저장소에 커밋하지 마세요.
- 민감한 정보는 서버 측에서 처리하는 것이 가장 안전합니다. 클라이언트 사이드에서의 API 키 사용은 프로덕션 환경에서는 권장되지 않습니다.
- 프로덕션 환경에서는 별도의 백엔드 API를 구축하여 API 키와 같은 민감한 정보를 안전하게 관리하는 것을 권장합니다.

## 라이센스

이 프로젝트는 MIT 라이센스를 따릅니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 프로젝트 설정 방법

1. 의존성 설치:
```bash
npm install
```

2. Gemini API 키 설정:
`.env.local` 파일에 Gemini API 키를 설정해야 합니다. 
```
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```
API 키를 얻으려면 다음 웹사이트를 방문하세요: https://ai.google.dev/tutorials/setup

3. 개발 서버 실행:
```bash
npm run dev
```

4. 브라우저에서 다음 주소로 접속:
```
http://localhost:3000
```

---
