# FIRE 생활 글 자동 발행 실험
- 경로: docs/journal/index.html, posts.json(version:1, posts 배열), images/ 아래 SVG.
- 한 회차 한 편. 최근 제목/slug/runId로 중복을 피한다. 첫 회는 게시 화면 구축 포함.
- 정적 HTML은 posts.json과 일치하도록 새 회차 글/목록을 추가한다. 모든 기존 글과 앵커를 보존한다. 문자열은 HTML escape한다. 사용자의 브라우저 저장 데이터는 읽지 않는다.
- 본문 800~1200자, AI 작성/가상 생활 제안 표시. 실제 체험·절약액·시세를 꾸미지 않는다. 변하는 사실은 공식 출처와 확인일이 필요하다.
- 관련 SVG 도해 1개, alt/직접 제작 표시. 스크립트/foreignObject/외부 참조 금지. 이미지 생성 API 호출 없음.
- runs.jsonl에 UTC 시간 단위 runId를 기록한다. 완료 및 awaiting_deployment 회차는 중복 게시하지 않고 배포 상태부터 확인한다. 최근 in_progress 회차가 있으면 충돌 여부 확인 후 중단한다.
- 실제 토큰 메타데이터를 조회할 수 없으면 tokens:null, tokenMeasurement:unavailable. 글자 수·시간·도구 호출은 토큰이 아닌 대리지표다. 회차 기록의 측정 종료 시점 이후 보고/로그 저장 비용은 제외될 수 있다.
- 첫 회 정적 검증: JSON 파싱·필수 데이터·1150자·중복 slug·이미지 존재·SVG 안전성 통과. Playwright 기본 바이너리 다운로드는 403으로 차단되었지만 시스템 /usr/bin/chromium으로 로컬 320/360/390/1200px 이미지 디코딩·앵커 이동·가로 넘침 검증을 통과했다. 390px 스크린샷 확인. 공개 URL 브라우저 접속은 프록시 ERR_TUNNEL_CONNECTION_FAILED로 미확인. 구현 커밋 8079b5708713ee274e91f094bf99cd8c306c86a3의 Pages 배포 성공(실행 43574117264). 기존 전체 QA는 기록 시점 진행 중.
