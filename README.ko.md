# Mold Press

한국어 · [English](README.md)

브라우저에서 파트를 모델링하고, 간이 금형을 만든 뒤, 프레스 생산과 조립까지 이어가는 제조 워크스페이스입니다. 계정이나 백엔드 없이 로컬에서 실행됩니다.

![Mold Press 작업 화면](docs/images/press.png)

## 실행

데스크톱 브라우저에서 **[index.html](<https://jtech-co.github.io/Mold-Press/>)** 을 여세요. 같은 위치의 `js/`, `css/` 폴더를 함께 유지하세요. 브라우저가 파일을 직접 불러오므로 사용을 위한 설치나 빌드는 필요 없습니다.

같은 주소에서 작업을 저장하고 다시 열려면 로컬 서버 실행을 권장합니다.

```bash
python -m http.server 8000 --bind 127.0.0.1
```

[localhost:8000](http://localhost:8000)에 접속하세요. 동일한 브라우저·주소·포트에서 기존 저장값을 불러옵니다. HTML을 직접 여는 `file://` 방식의 저장 동작은 브라우저에 따라 다릅니다. 권장 화면 크기는 1400 × 850 이상이며, 모바일 UI는 최적화되어 있지 않습니다.

내장 WebGL 렌더러는 네트워크 없이 동작합니다. 연결이 가능하면 기존의 선택적 **Three.js 0.152.2** 렌더러를 jsDelivr에서 불러옵니다. GPU 렌더링을 사용할 수 없으면 Canvas 3D로 전환합니다. 표면 질감에는 외부 이미지가 필요하지 않으며 Canvas에서는 조명을 단순화합니다.

## 작업 흐름

| 단계 | 주요 기능 |
| --- | --- |
| **Studio** | 기본체·메쉬 가져오기, 이동·회전·크기 조정, 그룹·정렬·측정·분할·불리언. 2D 스케치와 돌출·절삭·회전·스윕·로프트 피처. |
| **Tooling** | 파팅 축·위치 설정, 캐비티·코어·핀·런너·냉각수로·간이 사이드코어 생성, 레이어 및 반투명 보기. |
| **Press** | 생성된 금형과 소재 선택, 선택/전체 프레스. 형폐 → 성형 → 냉각 → 형개 → 취출 후 완료품 트레이에 적재. |
| **Assembly** | 생산된 파트 배치, 정렬·Mate, 간섭 확인, 분해도 및 완성본 내보내기. |

기본 샘플은 **바디 분할 → Tooling → 전체 금형 생성 → Press → 소재 선택 → 전체 프레스 → Assembly → 자동 조립** 순서로 체험할 수 있습니다. 금형 목록에서 선택한 대상은 원본이 그룹에 속해 있어도 정확히 한 바디를 가리킵니다. 일괄 생산 중 다음 금형으로 넘어갈 때 시점은 유지되며, **F**로 화면을 다시 맞춥니다.

## 소재와 표면

| 소재 | 화면 표현 |
| --- | --- |
| ABS | 미세한 새틴 입자 |
| PP | 은은한 왁스형 반광 |
| PC | 매끄러운 광택과 투명 보기 선택. Three.js 고품질에서는 투과 재질 사용 |
| Nylon | 무광의 미세 입자 |
| Aluminum 6061 | 방향성 있는 브러시드 금속 |
| Zinc | 미세한 금속 표면 변화 |
| CF Nylon | 짧은 섬유와 거친 무광. 직조 탄소섬유 패턴이 아님 |

금형에는 가공강 표면을, 프레스에는 도장 패널·연마봉·체결 볼트·캐비닛 통풍구·조작반 디테일을 적용했습니다. 질감은 물체를 이동·회전해도 표면에 붙어 있으며, 투입 소재·성형 파트·완료품에 일관되게 적용됩니다. 외관만 바뀌며 제조 계산값에는 영향을 주지 않습니다.

## 파일과 저장

| 형식 | 가져오기 | 내보내기 | 설명 |
| --- | --- | --- | --- |
| `.moldpress.json` | 지원 | 지원 | 금형·스케치·피처·트레이·조립을 포함한 편집 가능한 프로젝트. |
| STL | 바이너리 / ASCII | 바이너리 | mm 단위 형상. |
| OBJ | 지원 | 미지원 | mm 단위 메쉬 형상. |
| GLB | 비압축 glTF 2.0 | 지원 | 파일은 m, 앱 내부는 mm. 외부 텍스처·애니메이션·압축 형상은 가져오지 않음. |
| ZIP | 미지원 | 지원 | 바디별 STL 묶음. |
| PNG | 미지원 | 지원 | 프로젝트 캡션을 포함한 뷰포트 이미지. |

GLB 내보내기는 기본 색상·금속성·거칠기를 포함합니다. 뷰포트의 절차형 입자와 프레스 애니메이션은 파일에 베이크하지 않습니다. 20 MB 초과 파일은 가져올 수 없으며 메쉬·프로젝트 용량 제한도 적용됩니다.

현재 브라우저·사이트 저장소에 자동 저장합니다. 다른 환경으로 옮길 때는 **프로젝트 JSON 백업**을 사용하세요. **공유**는 같은 브라우저·사이트 저장소의 복제 스냅샷 링크를 만듭니다. 클라우드 공유가 아니므로 다른 기기에는 JSON 파일을 전달해야 합니다.

**초기화**를 확인하면 현재 프로젝트와 실행취소·다시실행 기록을 지우고 빈 Studio로 돌아갑니다. 확인 창이 열려 있는 동안 프레스는 일시 정지하고, 취소하면 재개합니다. 현재 UI 언어와 별도 복제 스냅샷은 유지합니다. 초기화 자체는 실행취소할 수 없습니다.

## 조작

| 입력 | 동작 |
| --- | --- |
| 드래그 / 휠 | 시점 회전 / 확대·축소 |
| 오른쪽 드래그 | 시점 이동 |
| Shift + 선택 | 다중 선택 |
| V / G / R / S / M | 선택 / 이동 / 회전 / 크기 / 측정 |
| F | 화면 맞춤 |
| Delete | 선택 삭제 |
| Ctrl/Cmd + Z | 실행취소 |
| Ctrl/Cmd + Shift + Z 또는 Ctrl + Y | 다시실행 |
| Ctrl/Cmd + D | 복제 |
| Esc | 현재 조작 또는 초기화 확인 취소 |

## 개발

**버전: 1.1.1.** 작은 `index.html`과 기능별 `js/`, `css/` 폴더로 실행 구조를 분리했습니다. 프로젝트 스키마와 저장 키는 버전 1을 유지해 제공된 Fix 6 프로젝트 파일과 호환됩니다.

`js/`, `css/`를 수정하고 브라우저를 새로고침하면 반영됩니다. [모듈 구조 안내](docs/ARCHITECTURE.md)에서 수정할 파일을 찾을 수 있습니다. Python 3.10 이상으로 파일 참조를 검사하거나 배포 폴더를 생성하세요.

```bash
python build.py
python build.py --check
```

빌드는 Python 표준 라이브러리로 필요한 파일을 `dist/site/`에 복사합니다. `--check`는 누락·중복·미참조 파일을 검사합니다. JS/CSS를 HTML로 합치지 않습니다. JavaScript 구문 검사에는 Node.js, 브라우저 회귀 테스트에는 Python Playwright를 사용합니다.

```bash
python -m pip install -r tests/requirements.txt
python -m playwright install chromium
python tests/check_syntax.py
python tests/kernel_contract.py
python tests/static_site.py
python tests/browser_workflow.py
python tests/storage_tests.py
python tests/press_selection_edges.py
python tests/release_smoke.py
python tests/release_smoke.py --three
```

`--three` 검사는 고정된 버전의 Three.js CDN에 접속해야 합니다. 나머지 테스트는 외부 요청을 차단합니다. CPU 대체 경로를 검사하려면 `MP_RENDERER=canvas` 환경변수를 설정하고 `release_smoke.py`를 실행하세요. `CHROMIUM_PATH`로 특정 Chromium 실행 파일을 지정할 수 있습니다. 테스트는 격리된 브라우저에서 실행되며 `tests/output/`에 결과를 저장합니다. 사용 중인 브라우저 프로젝트를 조작하지 않습니다.

```text
index.html                  Small entrypoint with external file references
js/core/, js/app/            Configuration, application state and action handlers
js/ui/, js/cad/              Screen components and CAD integration
js/geometry/, js/sketch/     Geometry and sketch feature kernels
js/assembly/, js/tooling/    Mates and mold geometry
js/press/                   Machine geometry and cycle motion
js/rendering/, js/viewport/  Renderers, camera and pointer controls
js/materials/               Material data and procedural finishes
js/project/, js/io/         Persistence, validation and file formats
js/vendor/                  Existing React runtime
css/                        Ordered styles grouped by layout and feature
assets.py                   Asset validation and complete-app fingerprint
build.py                    Copy runtime files to dist/site/
package.py                  Verified app and source ZIP packaging
tests/                      Regressions and synthetic fixtures
docs/ARCHITECTURE.md         Module map and dependency order
archive/v1.1.0/             Original single-file release, retained locally
```

## GitHub 배포 준비

`js/`, `css/`, `index.html`, 스크립트·테스트·문서를 저장소에 커밋하세요. 포함된 CI는 실행 파일 참조, 구문 및 오프라인 브라우저 회귀를 검사합니다. [변경 기록](docs/CHANGELOG.md)과 [검증 결과](docs/QA.md)에서 범위를 확인할 수 있습니다.

```bash
python package.py
```

`dist/Mold-Press-1.1.1.zip`(JS/CSS 폴더를 포함한 실행용), `dist/Mold-Press-1.1.1-source.zip`(소스·테스트 포함), SHA-256 체크섬을 생성합니다. 현재 HTML과 모든 JS/CSS에 대응하는 통과 보고서가 있어야 패키징하며, 생성된 테스트 출력과 과거 아카이브는 제외합니다.

GitHub Pages는 **Settings → Pages → Build and deployment → Source: GitHub Actions**로 설정한 뒤 **Deploy GitHub Pages** 워크플로를 수동 실행하세요. `dist/site/`의 HTML·JS/CSS·외부 라이브러리 고지를 게시합니다. 사이트 게시에는 해당 워크플로의 수동 실행이 필요합니다. 상세 절차는 [GitHub 공식 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)를 참고하세요.

## 범위와 라이선스

Mold Press는 형상과 공정을 체험하는 간이 에뮬레이터입니다. 용융 유동·열전달·프레스 하중·생산 안전성을 계산하지 않습니다. 살두께·구배·언더컷 검사는 표본 기반 근사이며, 소재 수축률·사이클 시간도 예시값입니다. Aluminum 6061은 압축/단조 개념 애니메이션으로 표현합니다. 복잡하거나 부적합한 메쉬에서는 형상 연산이 실패할 수 있습니다.

브라우저 검증 범위는 Chromium의 로컬 WebGL, 선택적 Three.js, Canvas 대체 경로입니다. 개별 GPU 하드웨어와 다른 브라우저 엔진 전체의 동작을 보장하지 않습니다. [QA 문서](docs/QA.md)에 검증 범위를 기록했습니다.

외부 라이브러리 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있습니다. Mold Press 자체 코드는 이 저장소에 지정된 [MIT 라이선스](LICENSE)로 배포합니다.
