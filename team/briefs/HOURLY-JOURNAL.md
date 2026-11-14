# FIRE 생활 글 자동 발행 실험
- 경로: docs/journal/index.html, posts.json(version:1, posts 배열), images/ 아래 SVG.
- 한 회차 한 편. 최근 제목/slug/runId로 중복을 피한다. 첫 회는 게시 화면 구축 포함.
- 정적 HTML은 posts.json과 일치하도록 새 회차 글/목록을 추가한다. 모든 기존 글과 앵커를 보존한다. 문자열은 HTML escape한다. 사용자의 브라우저 저장 데이터는 읽지 않는다.
- 본문 800~1200자, AI 작성/가상 생활 제안 표시. 실제 체험·절약액·시세를 꾸미지 않는다. 변하는 사실은 공식 출처와 확인일이 필요하다.
- 관련 SVG 도해 1개, alt/직접 제작 표시. 스크립트/foreignObject/외부 참조 금지. 이미지 생성 API 호출 없음.
- runs.jsonl에 UTC 시간 단위 runId를 기록한다. 완료 및 awaiting_deployment 회차는 중복 게시하지 않고 배포 상태부터 확인한다. 최근 in_progress 회차가 있으면 충돌 여부 확인 후 중단한다.
- 실제 토큰 메타데이터를 조회할 수 없으면 tokens:null, tokenMeasurement:unavailable. 글자 수·시간·도구 호출은 토큰이 아닌 대리지표다. 회차 기록의 측정 종료 시점 이후 보고/로그 저장 비용은 제외될 수 있다.
- 첫 회 정적 검증: JSON 파싱·필수 데이터·1150자·중복 slug·이미지 존재·SVG 안전성 통과. 로컬 Playwright 실행은 브라우저 바이너리 미설치, 다운로드 403으로 차단되어 화면/모바일 검증 미완료. 이를 성공으로 표시하지 않는다.
