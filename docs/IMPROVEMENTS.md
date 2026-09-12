# Manufacturing workspace improvements

Eight improvements are implemented and published in priority order. Each row links the user-facing scope with its verification. Existing projects remain compatible.

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Display-only capped X/Y/Z sections, opening gap, side-core direction correction | Complete: 35 enhancement checks, kernel and built-site checks passed |
| 2 | Smooth curved surfaces and contact lighting | Complete: 41 contracts on local WebGL, Three.js and Canvas; kernel unchanged |
| 3 | Material and machined-surface detail | Complete: 64 contracts on WebGL 2, WebGL 1, Three.js and Canvas |
| 4 | Process-specific machine and forming animation | Complete: 97 contracts, workflow/layout regressions and Three.js release checks |
| 5 | Pause, stepping and replay without duplicate production | Complete: 99 enhancement contracts including pause, stepping, replay and reset |
| 6 | Tool and machine component detail | Pending |
| 7 | Responsive geometry jobs and overlay updates | Pending |
| 8 | Named projects and recovery history | Pending |

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
