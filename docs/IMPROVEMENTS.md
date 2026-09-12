# Manufacturing workspace improvements

Eight improvements are implemented and published in priority order. Each row links the user-facing scope with its verification. Existing projects remain compatible.

| Step | Scope | Status |
| --- | --- | --- |
| 1 | Display-only capped X/Y/Z sections, opening gap, side-core direction correction | Complete: 35 enhancement checks, kernel and built-site checks passed |
| 2 | Smooth curved surfaces and contact lighting | Pending |
| 3 | Material and machined-surface detail | Pending |
| 4 | Process-specific machine and forming animation | Pending |
| 5 | Pause, stepping and replay without duplicate production | Pending |
| 6 | Tool and machine component detail | Pending |
| 7 | Responsive geometry jobs and overlay updates | Pending |
| 8 | Named projects and recovery history | Pending |

## 1. Section inspection / 단면 보기

In Tooling, use **Section / Explode** to adjust the opening gap, enable a section, select X/Y/Z, move the plane and reverse the visible side. Cut faces are amber. Sections change the viewport only; saved projects and exports retain their original geometry. Open or unsupported meshes remain whole and display a notice rather than silently disappearing.

Tooling의 **단면과 분해**에서 분해 간격, X/Y/Z 절단 축, 위치와 표시 방향을 조절합니다. 단면은 황색으로 표시하며 원본과 내보내기는 유지합니다. Y축 파팅의 사이드코어 방향도 금형·프레스 좌표계에서 일관되게 수정했습니다.

Verification: all three parting axes, outward slide travel in both coordinate systems, capped volumes, hollow-section holes, source preservation and browser controls (`tests/enhancements.py`).
