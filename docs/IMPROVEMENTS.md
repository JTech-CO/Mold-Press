# Manufacturing workspace improvements

Eight improvements are implemented and published in priority order. Each row links the user-facing scope with its verification. Existing projects remain compatible.

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Display-only capped X/Y/Z sections, opening gap, side-core direction correction | Complete: 35 enhancement checks, kernel and built-site checks passed |
| 2 | Smooth curved surfaces and contact lighting | Complete: 41 contracts on local WebGL, Three.js and Canvas; kernel unchanged |
| 3 | Material and machined-surface detail | Complete: 64 contracts on WebGL 2, WebGL 1, Three.js and Canvas |
| 4 | Process-specific machine and forming animation | Complete: 97 contracts, workflow/layout regressions and Three.js release checks |
| 5 | Pause, stepping and replay without duplicate production | Complete: 99 enhancement contracts including pause, stepping, replay and reset |
| 6 | Tool and machine component detail | Complete: 112 contracts for clearance, connections and labels |
| 7 | Responsive geometry jobs and overlay updates | Complete: 117 contracts, built subdirectory worker and workflow checks |
| 8 | Named projects and recovery history | Complete: 12 real-origin library checks; all 11 release suites passed |

## 1. Section inspection / 단면 보기

In Tooling, use **Section / Explode** to adjust the opening gap, enable a section, select X/Y/Z, move the plane and reverse the visible side. Cut faces are amber. Sections change the viewport only; saved projects and exports retain their original geometry. Open or unsupported meshes remain whole and display a notice rather than silently disappearing.

Tooling의 **단면과 분해**에서 분해 간격, X/Y/Z 절단 축, 위치와 표시 방향을 조절합니다. 단면은 황색으로 표시하며 원본과 내보내기는 유지합니다. Y축 파팅의 사이드코어 방향도 금형·프레스 좌표계에서 일관되게 수정했습니다.

Verification: all three parting axes, outward slide travel in both coordinate systems, capped volumes, hollow-section holes, source preservation and browser controls (`tests/enhancements.py`).

## 2. Curves and lighting / 곡면과 조명

The viewport quality selector offers Fast, Standard and High. Render-only, angle-weighted normals smooth curves while keeping boundaries above 35 degrees sharp. Standard adds lightweight ground contact shading; High adds dynamic soft shadows in Three.js. Canvas interpolates vertex lighting and adjusts its raster resolution. Fast removes contact shading and lowers the pixel budget. CAD meshes and exported geometry are unchanged.

뷰포트 품질 선택에서 성능·표준·고품질을 선택합니다. 곡면을 매끄럽게 표현하면서 35도 이상의 모서리는 유지합니다. 표준은 가벼운 바닥 음영을, Three.js 고품질은 실시간 부품 그림자를 제공합니다. 원본 메쉬와 내보내기는 유지합니다.

## 3. Surface finishes / 소재와 가공면

Machined mold exteriors use fine directional grain; interior surfaces reduce the grain and polish the GPU roughness response. Continuous procedural patterns fade below pixel size to reduce distant striping, with derivative-based micro-bumps on supported GPU paths. Canvas uses filtered color detail. All patterns remain attached to object coordinates.

Select a PC body and enable **Clear PC** in the viewport toolbar. Three.js High uses a transmission material; the other paths use lightweight alpha transparency. This is a viewport preference and does not change saved geometry or export materials.

금형 외곽의 가공면과 내부 연마면을 구분하고, 확대율에 따라 미세 무늬를 완화합니다. PC를 선택하면 뷰포트의 **PC 투명** 옵션을 사용할 수 있습니다. 투명 보기는 화면 설정이며 원본 형상과 내보내기 소재는 유지합니다.

## 4. Material-driven processes / 소재별 공정

Resins use a hollow hopper, pellet charge, injection ram and progressive cavity filling. Aluminum 6061 retains the illustrative blank-feeding/compression route with an additional forming stroke. Zinc uses a melt reservoir, injection flow and solidification stage. Material selection updates equipment, stage labels and charge geometry. Injection and casting keep the mold closed while filling.

Progressive filling uses cached capped sections of the display mesh. Unsupported open meshes fade into view. The original mesh and final shrink calculation are unchanged. These are explanatory animations, not flow, thermal or load solvers.

수지는 호퍼·펠릿·사출 램과 점진 충전, Aluminum 6061은 판재 투입과 압축, Zinc는 용탕 저장부·주입·응고를 표시합니다. 소재를 선택하면 설비와 단계 이름이 바뀝니다. 최종 제품 생성과 수축 계산은 유지하며 실제 유동·열·하중 해석은 수행하지 않습니다.

## 5. Playback / 재생 제어

Pause freezes the cycle clock. Next stage advances to the next process boundary and pauses; the final step produces exactly one part. Replay last completed cycle uses the original completed body and supports scrubbing. Replay changes neither project data nor tray counts. The replay source lasts for the current session and clears when switching or resetting projects.

일시 정지는 사이클 시간을 멈춥니다. 다음 단계는 공정 경계까지 진행하며 마지막 단계에서 완료품을 한 번 생성합니다. 최근 완료 사이클 다시 보기는 당시 소재와 형상을 사용하며 위치 이동을 지원합니다. 다시 보기는 프로젝트와 완료품 수를 바꾸지 않으며 프로젝트 전환·초기화 시 해제됩니다.

## 6. Component detail / 부품 상세

External guide posts use hollow bushes and mounting ears. Ejector pins share a moving plate with an 8 mm stroke; spacer rails leave clearance above the fixed platen. Cooling circuits include couplers and supply/return hoses. Injection nozzles connect to the transformed gate for X/Y/Z tooling. Enable Labels in Tooling or Press to identify visible components. These remain illustrative equipment assemblies, not manufacturing drawings.

외부 가이드 포스트에 중공 부시와 장착부를 추가했습니다. 취출판과 핀은 함께 8 mm 이동하며 하부 스페이서가 이동 공간을 확보합니다. 냉각 커플러·공급/회수 호스와 파팅 축별 노즐 연결을 표시합니다. Tooling/Press의 부품명 옵션으로 구성 요소를 확인합니다.

## 7. Geometry jobs / 연산 응답성

HTTP(S) builds execute mold generation, boolean operations and capped splitting in a dedicated Worker. Batch progress and cancellation are available; successful results commit atomically after checking that the source project is still current. Worker errors leave the source intact. Local file mode preserves offline operation with yielding between batch items; an individual local operation can still block briefly. Idle overlays skip geometry bounds and DOM writes until the scene, camera or UI changes.

HTTP(S)에서는 금형 생성·불리언·분할을 워커로 실행하고 진행률과 취소를 제공합니다. 완료 시 원본 프로젝트가 그대로인지 확인한 뒤 결과를 적용합니다. 디스크에서 직접 열면 배치 항목 사이에 양보하는 로컬 연산을 사용하며 개별 연산 중에는 잠시 화면이 멈출 수 있습니다. 유휴 상태에서는 불필요한 경계 계산과 오버레이 DOM 갱신을 생략합니다.

## 8. Project library / 프로젝트 보관함

Projects supports naming, saving separate copies, opening saved projects, confirmed deletion and restoring the latest five revisions. Compressed snapshots live in IndexedDB; existing localStorage autosave remains supported. The library shows stored snapshot bytes and the browser site quota estimate when available. Restoration validates saved data and preserves the previous workspace first. Corrupt current data or localStorage quota failures can recover from the latest valid library save. Browser site-data deletion removes both stores; JSON remains the portable backup.

프로젝트 메뉴에서 이름 저장·별도 사본·열기·삭제 확인·최근 5개 저장 이력 복원을 제공합니다. IndexedDB 보관함과 기존 자동 저장을 함께 사용하며 보관 데이터와 사이트 용량을 표시합니다. 복원할 데이터는 검증하고 현재 작업을 먼저 보관합니다. 현재 저장값이 손상되거나 localStorage가 가득 찬 경우 보관함에서 복구합니다. 사이트 데이터 삭제 시 보관함도 삭제되므로 JSON 백업을 유지하세요.
