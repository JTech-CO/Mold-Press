# 코드 구조 / Code structure

`index.html`은 초기 화면과 외부 파일 목록만 담습니다. 실제 실행 코드는 루트의 `js/`, 스타일은 `css/`에 있습니다. 파일 수정 후 브라우저를 새로고침하면 바로 반영되며, HTML로 합치는 빌드 과정은 없습니다.

The entry HTML contains the initial loading view and ordered external asset references. Edit `js/` or `css/` and reload the browser; there is no concatenation step.

## JavaScript

```text
js/
├── main.js                 프로젝트 복원과 React 앱 시작
├── core/                   네임스페이스·버전·저장 키
├── app/
│   ├── app.js              앱 상태 초기화와 생명주기
│   └── actions/            모델링·변형·프레스·조립·파일·공유·초기화
├── ui/
│   ├── components.js       아이콘·버튼·숫자 표시 등 공통 요소
│   ├── error-boundary.js   오류 화면과 복구 다운로드
│   ├── views/              Studio·Tooling·Press·Assembly·인스펙터·대화상자
│   └── cad/                스케치 보드·도구·피처·Mate 인스펙터
├── cad/                    CAD 명령과 기존 앱 동작의 연결
├── geometry/               메쉬·변환·기본체·CSG·분할·분석·텍스트
├── sketch/                 2D 수학·요소·프로파일·솔리드·피처 재생성
├── assembly/               회전 수학·면 인식·Mate 해석
├── tooling/                캐비티·코어·핀·런너 등 금형 형상
├── press/                  프레스 기계 형상과 사이클 움직임
├── rendering/              장면 레코드·WebGL·Canvas·Three.js 렌더러
├── viewport/               카메라·화면 맞춤·포인터 조작
├── materials/              소재 데이터·절차형 질감·금속 반사 환경
├── project/                샘플·검증·저장·CAD 데이터 복원
├── io/                     파일 가져오기·STL·GLB·ZIP·다운로드
└── vendor/                 원본 React·React DOM 라이브러리
```

| 변경하려는 기능 / Change | 시작할 파일 / Entry file |
| --- | --- |
| 프레스 순서·속도·완료 처리 | `js/app/actions/press.js` |
| 프레스 기계 부품 | `js/press/machine.js` |
| 형폐·성형·취출 움직임 | `js/press/motion.js` |
| 금형 형상·레이어 | `js/tooling/molds.js` |
| 소재 물성 | `js/materials/catalog.js` |
| 표면 질감·금속 반사 | `js/materials/surfaces.js` |
| 로컬 WebGL / Canvas / Three.js | `js/rendering/*-renderer.js` |
| 화면 회전·확대·드래그 | `js/viewport/controls.js` |
| 저장·가져오기 검증 | `js/project/storage.js`, `js/project/validation.js` |
| 내보내기 | `js/io/`, `js/app/actions/files.js` |
| 특정 단계의 화면 | `js/ui/views/` |
| 스케치·Mate 조작 | `js/cad/`, `js/ui/cad/` |
| 프로젝트 초기화 | `js/app/actions/reset.js` |

## 로딩과 의존성 / Loading and dependencies

모든 파일은 `index.html`의 `<script defer src="…">` 순서로 실행됩니다. ES module이나 동적 파일 로더 없이 기존 `window.MP` 네임스페이스를 유지하므로 로컬 HTML 직접 열기도 지원합니다. 각 파일은 독립 함수 범위로 감싸져 있어 내부 변수가 전역에 흩어지지 않습니다.

1. React 런타임과 `core/namespace.js`를 로드합니다.
2. 형상·프로젝트·소재·렌더러·스케치·Mate 기능을 등록합니다.
3. CAD 컴포넌트와 확장, 공통 UI, 앱 동작과 뷰를 등록합니다.
4. `app/app.js`가 앱 클래스를 조립합니다. 생성자에서 동작을 등록한 뒤 초기 상태와 CAD 확장을 설정합니다.
5. 마지막 `main.js`가 저장된 프로젝트를 읽고 화면을 시작합니다.

`MP.AppActions`에는 이벤트 동작을 설치하는 함수, `MP.AppViews`에는 화면 메서드, `MP.CadInstallers`에는 CAD 확장을 등록합니다. 기존 동작을 감싸는 CAD 확장의 설치 순서는 `js/cad/install.js`에서 확인할 수 있습니다. 이벤트 핸들러의 `this`와 기존 함수 캡처를 유지하기 위한 구조입니다.

Shared registries retain the application's existing namespace and event-handler behavior. `main.js` runs only after all deferred files have registered their functions. When adding a file, list it in `index.html` after its dependencies and before its consumers.

`assets.py`는 HTML에서 실제 파일 목록을 읽고, 빠진 파일·중복 참조·참조되지 않는 JS/CSS를 검사합니다. 검증 결과의 SHA-256은 HTML뿐 아니라 모든 실행 JS/CSS의 경로와 내용을 함께 포함합니다.

## CSS

| 파일 | 책임 |
| --- | --- |
| `base.css` | 색상 변수·리셋·입력 요소 기본값 |
| `shell.css` | 헤더·내비게이션·공통 버튼 |
| `sidebar.css` | 좌측 도구와 트리 |
| `viewport.css` | 캔버스·카메라 도구·기즈모·하단 영역 |
| `inspector.css` | 변형 입력·분석 결과·레이어 |
| `production.css` | 소재·시퀀스·완료품 트레이 |
| `dialogs.css` | 모달·상태·로딩 및 기본 반응형 규칙 |
| `panels.css` | 인스펙터·트리의 세부 배치 |
| `typography.css` | 글자 크기·가독성 및 반응형 보정 |
| `editing.css` | 치수 편집·정렬·내보내기 |
| `cad.css` | 스케치·피처·Mate 화면 |
| `press-workflow.css` | 금형 선택·하단 시퀀스·초기화 |
| `materials.css` | 소재 미리보기 질감 |

원본의 규칙 순서를 보존한 상태로 분리했습니다. 뒤쪽 파일에는 앞의 기본값을 보정하는 규칙이 있으므로 HTML의 CSS 순서를 임의로 바꾸지 마세요. 새 규칙은 해당 기능 파일에 추가하고 KR/EN 화면 크기 검사를 실행하세요.

## 개발·검증·배포 / Develop, verify and deploy

```bash
# 선택 사항: 개발용 포매터 설치 / Optional formatter installation
npm ci
npm run format:check

# 실행 파일 참조 확인 / Validate runtime references
python build.py --check

# 브라우저 회귀 / Browser regressions
python tests/run_all.py

# 정적 사이트 파일 복사 / Copy deployable static files
python build.py
```

`dist/site/`에는 HTML과 필요한 `js/`, `css/`, 라이브러리 고지가 함께 생성됩니다. 배포나 파일 전달 시 세 항목을 같은 상대 경로로 유지하세요. ZIP 패키징과 GitHub Pages 워크플로도 이 구조를 사용합니다.

`archive/v1.1.0/`에는 분리 전 버전이 보존되어 있습니다. 개발 대상은 현재 루트의 `js/`와 `css/`이며, 이전 `src/`나 단일 HTML을 수정할 필요가 없습니다.
