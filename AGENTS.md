# 알찬끼 프로젝트 작업 규칙

## 제품
- 현재 중심 경험은 3매치 퍼즐 → 여행 진행 → 포인트/의상 수집 → 2D 캐릭터 꾸미기다. 식사 피드·레시피·장보기는 메인에서 제외하고 기존 개인 저장 데이터는 유지하되 이전 기록 보관함은 사용자 요청으로 제거했다. FIRE/월예산은 기존 도구로 유지한다.
- 서비스의 현재 기능과 제약은 `team/README.md`, 우선 과제는 `team/BACKLOG.md`를 읽는다.
- 사용자 요청이 최우선이다. 역할 문서는 구현을 돕는 기준이며 추가 승인 절차를 만들지 않는다.

## 작업 방식
- 업무는 기획 → 디자인 → 개발 → 품질검증 → 릴리스 순서로 이어간다. 작은 수정에는 필요한 단계만 적용한다.
- 기본적으로 한 에이전트가 역할을 차례로 수행한다. 사용자가 다중 에이전트 협업을 명시적으로 요청하면 역할을 나눌 수 있다. 상시 직원이나 백그라운드 작업이 존재한다고 표현하지 않는다.
- 다중 에이전트에서는 총괄이 담당 파일과 산출물을 지정하고, 독립적인 검토를 병렬 진행할 수 있다. 같은 파일의 수정은 한 담당자에게 맡긴다.
- 핵심 역할별 책임과 완료 기준은 `team/ROLES.md`를 따른다.
- 요청 범위 안에서 구현·검증까지 진행한다. 미결정 선호는 합리적으로 가정하되 사용자에게 가정을 알린다.

## 현재 구현과 배포
- `docs/`가 GitHub Pages 배포 디렉터리다. 현재 메인 앱은 `docs/index.html`이다.
- 주 메뉴는 `#home`(홈), `#arcade`(게임), `#avatar`(꾸미기), `#read`(내 기록) 4개다. FIRE/월예산은 내 기록의 접힌 생활 도구에서 연다. `#saved-meals`, `#meal-compose`는 맥락별 링크와 기록 허브에서 연다. 상세는 `#meal?id=...`, 이전 놀이터는 `#arcade`다. `#challenge`, `#story`, `#fire`, `#play`, `#community`의 기능과 저장 데이터도 유지한다.
- 화면 전환과 탭별 스크롤 복원은 `docs/navigation.mjs`, 최근 7일 도전 표시는 `docs/challenge-history.mjs`에 둔다. 브라우저 기본 fragment 스크롤과 중복되지 않도록 내부 링크 경로를 유지한다.
- 식사 데이터·계산·UI는 `docs/meal-data.mjs`, `meal-core.mjs`, `meals.mjs`, `meals.css`에 있다. 기록 키는 `teum-meals-v1`이며 사진을 포함해 브라우저에만 저장한다.
- 새 퍼즐 엔진은 `docs/puzzle-core.mjs`, UI는 `docs/puzzle.mjs`다. 이야기는 `docs/story-data.mjs`, `docs/story.mjs`에 둔다. 퍼즐 변경 시 `node tests/puzzle.test.mjs`와 관련 모바일 CI를 확인한다.
- 외부 RSS 수집: `scripts/update-feeds.py`. 자동화: `.github/workflows/refresh-feeds.yml`.
- `docs/feeds.json`은 자동 생성 결과다. 원본을 꾸며 넣지 않고 수집 스크립트를 수정한다.
- GitHub 저장소의 최신 파일과 SHA를 먼저 확인한다. 실행 환경의 Git 체크아웃이 원격 최신과 같다고 가정하지 않는다.
- 배포 성공은 해당 커밋의 GitHub Actions 결과로 확인한다. 브라우저 검증은 별도이며, 못 한 검증은 명시한다.

## 필수 제품 기준
- 식사 예시 단가·AI 일러스트·개인 기록을 구분한다. 실제 매장 조사 가격이나 실제 이용자 글로 꾸미지 않는다.
- 1인분 사용량 원가와 처음 포장 단위 구매비를 구분하고 밥·기름·양념 포함 기준, 조리 에너지 등 제외 항목을 표시한다.
- 개인 식사 사진·기록을 승인 없이 외부로 전송하지 않는다. 현재는 다른 사용자와 공유되지 않는다.
- 게시판은 현재 localStorage 체험용이다. 사용자 간 공유, 인증, 서버 저장이 되는 것처럼 표현하지 않는다.
- 자산·목표·게시글·댓글을 승인 없이 외부 분석 서비스로 보내지 않는다. API 키를 정적 페이지에 넣지 않는다.
- 외부 데이터는 안전한 URL만 사용하고, 사용자 입력과 외부 제목은 `textContent`로 렌더링한다. 출처·수집 시각·실패 상태를 유지한다.
- 금융 계산은 가정과 제외 항목을 표시한다. 수익을 보장하거나 인출률을 수익률처럼 설명하지 않는다.
- 모바일 게임의 `touch-action: manipulation`을 유지한다. 페이지 전체의 핀치 확대를 막지 않는다.
- 실제 사용자, 트래픽, 수익 지표를 만들어내지 않는다.
- GitHub Pages는 학습용 프로토타입으로 사용하며 상업 운영 전 적합한 호스팅으로 전환한다.

## 검증
- 변경 규모에 맞는 검증만 한다. 문서 변경에는 앱 테스트를 새로 만들지 않는다.
- 탭 변경 시 하나의 화면만 표시되는지, 주소 직접 열기와 뒤로가기가 작동하는지 확인한다.
- 계산식·게임·게시판을 수정하면 경계값과 저장 실패를 포함한 의미 있는 동작을 검증한다.
- 모바일 검증 기준 폭은 360px와 390px이며 가로 넘침, 키보드 포커스, 버튼 터치 영역을 살핀다.
- 실행 환경이나 브라우저 도구 오류를 우회해 검증 성공으로 보고하지 않는다.

- 혼자 쓰는 식탁 도구는 `docs/meal-solo-core.mjs`, `meal-solo.mjs`, `meal-solo.css`. 별도 키 `teum-meal-solo-v1`에 재료·계획·최대 1,000개 식사 일지를 저장한다. 기존 레시피·사진 데이터는 보존한다. 일지 CSV는 레시피/사진 백업이 아니다.

- 주식 FIRE 계산기는 `docs/fire-core.mjs`, `fire.mjs`, `fire.css`에 분리한다. 키 `teum-fire-portfolio-v1`은 티커별 평가액/추가 투자와 적용 수익률 근거를 브라우저에 저장한다. 기존 `teum-goal`은 덮어쓰지 않고 최초 현금 항목으로만 이관한다. 공개 과거 자료는 `scripts/update-stock-returns.py`, 월간 갱신·Pages 재빌드는 `.github/workflows/refresh-stock-returns.yml`. 투자자 개인 입력은 수집 작업에 보내지 않는다.

- 로그인 없는 티커 조회는 `docs/stock-lookup-core.mjs`, `stock-lookup.mjs`. 공개 Yahoo chart 자료를 실제 접속 검증된 cors.dev 경유로 읽는다. 티커·공개 조회 기간만 전송하고 수량·평가액·환율·생활비는 보내지 않는다. 조회 실패 시 기존 근거를 보존하고, 다른 티커로 바뀐 뒤 도착한 응답은 적용하지 않는다. 실제 외부 의존 검증은 `Check public stock lookup`, 결정 기록은 `team/briefs/ANONYMOUS-TICKER.md`.

- FIRE 기본 진입은 `docs/fire-quick.mjs`의 세 금액 간편 계산이다. 키 `teum-fire-quick-v1`, 전체 자산 연 5%/물가 2%/인출 4%는 수정 가능한 기본 가정이며 종목 역사에서 가져온 값이 아니다. 종목 도구는 `#fire-advanced` 안에서 유지하고 해당 브라우저 검증은 먼저 details를 연다. `#fire-life`는 `docs/fire-life-core.mjs`, `fire-life.mjs`, `fire-life.css`의 창작 한 달 시뮬레이션이며 `teum-fire-life-v1`에 최근 12개 가상 기록을 보관한다. 실제 시세/가계부/금융 자산과 혼동하지 않는다. 예비비는 실제 남은 현금보다 크게 표시하지 않는다.

- 가상 한 달의 기본 생활비는 직접 입력받지 않는다. 월 예산 하나로 월세30/식비20/관리비·공과금·통신 등10/교통5/여가10/예비비10/여유15%의 예시를 자동 배분한다. 공식 권장 비율/실거래 시세로 표현하지 않는다. 금액은 100원 단위, 배분액과 미배분액의 합계가 예산과 일치해야 한다. ratio-v1 현재 계획과 예전 수동 입력 기록을 구분하고 과거 기록의 금액은 바꾸지 않는다.

- 생활비 기준표의 7개 항목은 ON/OFF 가능하다. OFF 금액은 0이며 나머지 ON 항목의 원래 가중치에 비례해 재배분한다. 금액과 표시 비율은 각각 나머지 배분으로 합계를 맞춘다. 전부 OFF이면 전액 미배분으로 표시하고 가상 선택을 잠시 중단한다. excluded 목록을 현재 계획/기록에 보관하며 미지정인 과거 계획은 모두 ON으로 해석한다.

- 홈/기록 허브는 `docs/hub.mjs`, `hub.css`에 있다. 예전 읽기·퀴즈·일기는 `#read-archive`, 예전 자유 매치/게시판 링크는 `#prototype-archive`에 접어둔다. 해당 기능의 QA는 먼저 보관함을 연다. 상단과 하단의 4개 경로를 일치시키고, 홈페이지에는 실제 기록 개수/진행 여부만 표시하며 재무 금액은 자동 노출하지 않는다. [전체 재검토](team/briefs/SITE-REVIEW.md).

- 장바구니 최적화기는 `docs/cart-{data,core,worker}.mjs`, `cart.mjs`, `cart.css`다. 10개 기획 예시 내 1~7끼 조합을 전수 비교하며 실제 시장 최저가가 아니다. 포장 단위 구매비와 사용량 원가를 구분한다. 별도 키 `teum-cart-v1`에 재고/진행/최근 6개 계획을 저장한다. 구매·조리 명시 동작만 재고에 반영하고 마지막 동작만 되돌린다. 기존 식탁 도구/저장 키는 보존한다. [범위와 검증](team/briefs/CART-OPTIMIZER.md).

- 소프트 아케이드 디자인은 `docs/soft-theme.css`, `soft-theme.mjs`, `soft-graphics.mjs`가 담당한다. 홈은 게임 우선이며 장보기는 홈과 기록의 맥락 링크로 유지한다. 게임/선택극/기존 자유매치는 게임 탭, 꾸미기는 독립 탭, 생활 도구/식사 기록/게시판은 내 기록 탭으로 표시한다. 퍼즐 아이콘은 고정 벡터이고 접근성 이름과 게임 판정/저장은 기존 엔진을 유지한다. [디자인 결정](team/briefs/SOFT-ARCADE.md).

- 특수 조각 규칙은 `docs/puzzle-specials.mjs`(4개 직선 방향 번개, T/L 폭탄, 5개 직선 무지개와 특수 교환 조합), `puzzle-fx.mjs`는 해당 프레임 effects/births/combination만 표현한다. 변경 시 puzzle-specials 단위/브라우저 검사와 기존 점수·저장·모션 회귀를 실행한다. 저장된 row/bomb과 새 col/rainbow를 모두 검증한다.

- `#lab` 기믹 도전은 별도 `puzzle-lab.mjs` 엔진, `lab.mjs` 화면, `lab-saves.mjs` 저장이다. 키 `teum-puzzle-lab-v1`만 쓰고 일반 점수/스테이지 판은 기존 규칙을 유지한다. 충전 스킬은 이동을 쓰지 않으므로 undo는 actions 차이도 검증한다. 보너스는 엔진에서 1회 계산해 저장하고, UI는 프레임만 재생한다. 새 기믹 변경 시 lab 단위/브라우저 및 기존 특수/점수/모션 회귀를 확인한다.

- 20수 새 판의 연쇄 프로필은 `burst-v1`이다. 이전 저장판/같은 판 재시작은 기존 프로필을 유지하며 기믹 엔진은 `createScorePuzzle(seed,false)`로 기존 RNG를 보존한다. 변경 시 `tests/burst.test.mjs`와 점수/기믹 테스트를 확인한다. 결정 기록: `team/briefs/BURST-FEEL.md`.

- 스토리 퍼즐은 #journey 지도와 #challenge?journey=N, journey-{data,saves}.mjs/journey.mjs, 키 teum-journey-v1이다. 기존 선택극 #story는 보존한다. configFor로 목표를 읽고 일반 슬롯에 journey 상태를 저장하지 않는다. 집중은 game-focus.mjs/journey.css, 전체화면 불가 시 집중 유지. tests/journey.test.mjs와 journey-focus-browser.cjs를 확인한다.

- 여행 콘텐츠는 journey-content/*.mjs 지역 pack을 journey-data.mjs 배열 끝에 추가한다. journey-catalog.mjs가 지역/순차 ID를 검증한다. 공개된 기존 ID/순서/목표/seed 규칙을 변경하지 않는다. 지도는 한 지역·최대 10노드 구간만 표시한다. 15판/지역당5판을 UI에 하드코딩하지 않는다. tests/journey-catalog.test.mjs와 journey-map-browser.cjs, 기존 진행/집중 검증을 확인한다. [확장 절차](team/briefs/JOURNEY-MAP.md).

- 아바타 #avatar는 avatar-{data,core,art,store,reward-core,rewards}.mjs와 avatar.mjs/avatar.css에 있다. 키 teum-avatar-v1에 포인트/claim/구매/장비를 함께 저장한다. 게임 완료 상태 검증과 claim 중복 방지를 거쳐 지급하고 일반 게임 종료 이벤트만으로 지급하지 않는다. 공개된 아이템 ID/가격/기본 무료품을 이관 없이 변경하지 않는다. tests/avatar.test.mjs와 avatar-browser.cjs, 기존 게임/집중 회귀를 확인한다. [설계](team/briefs/AVATAR-WARDROBE.md).

- 홈에 식사 피드·레시피 작성·장보기 카드를 다시 노출하지 않는다. 기존 식사 예시는 #meal-archive, 개인 기록은 #read의 접힌 food-tools-archive에서 연다. meals.mjs는 게임/홈에서 식사 피드를 렌더링하지 않는다. 개인 데이터와 기존 상세 경로를 삭제하지 않는다. [정리와 제안](team/briefs/GAME-FOCUS-REVIEW.md).

- B안 캐릭터는 avatar-art.mjs의 정지 래스터 레이어 합성이다. avatar-layers.mjs의 atlas source/target 좌표와 avatar-rig.mjs의 확대/겹침 규격을 따른다. assets/avatar-art/wardrobe-v1/ 원본 PNG를 보존하며 도형 캐릭터로 축약하지 않는다. 각 부위는 독립 원화이며 상의별 몸체 가림과 신발 좌우 배치를 확인한다. 아이템 ID/가격/지갑 키는 유지한다. tests/avatar-cel.test.mjs, avatar-cel-browser.cjs와 기존 구매/보상 검사를 확인한다.

- #avatar와 #avatar?view=wardrobe는 원화 코디·옷장이다. 피부 4톤/표정 3종, 52개 의상을 실제 착장에 합성한다. #avatar?view=reference는 초기 고정 디자인 원화로 현재 착장과 별도 표시한다. 새 포즈/애니메이션은 중단 상태를 유지한다. [정지원화·옷장 기준](team/briefs/AVATAR-QUALITY-MASTER.md), tests/avatar-quality-browser.cjs를 확인한다.

- 의상 추가/원화 좌표/profile 변경 시 [의상 검사 규격](team/briefs/AVATAR-QA.md)을 따른다. avatar-layers.mjs에 필수 profile/atlas/좌표를 등록하고 avatar-profiles.mjs에서 의미 기반 렌더링을 정의한다. avatar-qa.mjs가 catalog에서 사례를 자동 생성한다. `node tests/avatar-qa.test.mjs`, `node scripts/check-avatar-assets.mjs`, catalog/review 브라우저 검사와 기존 fit/지갑 회귀를 실행한다. 새 원화는 avatar-review/에서 확대 육안 검토한다. `.github/workflows/avatar-art-check.yml`의 전체 분할/집계 결과를 확인하고 부분 성공을 전체 통과로 말하지 않는다. 자동 검사와 그림의 미적 품질, 별도 Pages 배포를 구분한다.

- 상의의 목선은 avatar-layers.mjs의 필수 neckline 등록과 avatar-neckline.mjs로 보정한다. 실제 목 알파와의 교집합만 투명하게 처리하고 앞깃을 남긴다. 새 상의는 top-look 전 피부/표정 검사와 확대 육안 검토를 진행한다. 원본 PNG·가격·아이템 ID는 보존한다.

- 긴 소매에는 cuffs(scale/rightShift/openings)를 등록하고 목의 폭·높이와 양쪽 손목을 함께 확대 검토한다. top-look에서 입구 투명도뿐 아니라 소매가 손바닥을 덮지 않는지 검사한다. 얼굴/손 원본과 지갑은 유지한다.

- 카라에는 neckline.tilt, 긴 소매에는 좌우 독립 cuffs.frames(pivot/angle/turn/width/shift)를 등록한다. avatarWristRig의 실제 손목 중심/각도와 맞추며, 소매 앞 원단을 유지하고 그 아래로 손이 나오게 한다. 손목 축의 연결과 위쪽 원단 지점을 검사하고, 가이드를 끈 확대 화면에서 피부 구멍/V자 절개가 없는지 확인한다.

- 전신 피팅은 [검토 기록](team/briefs/AVATAR-FULL-FIT.md)을 따른다. 긴 하의 legFit, 부츠 openings, 안경 lensAnchors를 필수 등록한다. 가방 끈은 어깨 표면/머리 뒤에 두고 새 소품 perchPoints의 모든 상의 접촉을 확인하며 피부색으로 스타킹·안감이 바뀌지 않게 한다. 원본 PNG와 지갑을 유지하고 전신/부분/피부색별 육안 검토 및 현재 962개 동적 검사·누락 집계를 확인한다.

- 메뉴 간소화: `menu-focus.mjs/css`는 검증된 여행·지갑을 읽어 홈/게임 이어하기와 기록 요약만 표시한다. 저장 키를 초기화·이관하지 않는다. 게임의 날짜별/연습 판은 `#game-more-modes`, 생활 도구는 `#life-tools`, 원화 참고는 `#avatar-reference-menu`를 먼저 펼친다. 기존 주소/DOM ID/저장 구조는 보존한다. [메뉴 정리](team/briefs/MENU-FOCUS.md).

- 의상 찜·코디 3칸·지역 기념 배경/장식/배지는 `collection-core.mjs`, `collection-ui.mjs`, `collection.css`에서 제공한다. `teum-avatar-v1`의 선택적 collection 필드로 기존 지갑을 읽으며, 구매·전체 코디 착용은 단일 지갑 트랜잭션이다. 지역 해금은 journeyCatalog의 실제 지역 levelIds 전체 완료로 판단한다. 기존 의상 ID/가격/원화와 저장 구조는 유지한다. tests/collection.test.mjs와 collection-browser.cjs를 확인한다.

- 새 미션판은 `puzzle-missions.mjs`와 `journey-content/prism-workshop.mjs`에 있다. 16~20번만 missionCount를 저장하며 1~15번의 판정·RNG·프레임을 이전 엔진과 동일하게 유지한다. 실제 드래그는 `puzzle-drag.mjs`이고 게임판의 조각은 pinch-zoom으로 페이지 확대를 허용한다. `puzzle-guide.mjs`는 처음 한 수/특수 조각 안내, `score-journal.mjs`는 최고 기록 추격/최근10판이다. `outfit-export.mjs`는 동일 출처 원화를 내장한 SVG를 캔버스에 그려 저장된 코디의 PNG를 만든다. PNG 생성·내려받기와 실제 터치 입력은 `tests/play-upgrades-browser.cjs`로 검증한다.

- 목표 피드백은 `puzzle-objectives.mjs/css`의 표현 계층이다. 결과의 부족분은 실제 config/state에서 계산하며 20수 점수판에는 수집 목표를 표시하지 않는다. 실패 결과의 마지막 한 수 복원은 기존 undo 슬롯을 사용하고 보상/별/클리어 기록을 지급하지 않는다. `tests/puzzle-objectives-browser.cjs`에서 모바일/가로 집중 모드·실제 실패/복원·저장 재열기·미션 힌트를 확인한다.

- 이전 기록 보관함(`legacy-archive`)과 내부 식사/읽기/일기/실험 메뉴는 사용자 요청으로 제거했다. 관련 daily UI와 피드 조회/착시 UI도 메인에서 제거했으며 다시 노출하지 않는다. 기존 브라우저 저장 키와 예전 직접 주소의 식사·게임·게시판 기능은 유지한다. 생활 도구와 게임/코디 기록은 그대로 제공한다.

- 홈/게임 상단의 두 진입은 동일한 `스테이지`와 `랜덤 한 판` 이름과 동등한 카드로 표시한다. 랜덤의 20번 교환은 규칙 설명으로 둔다. `menu-focus.mjs`가 검증된 점수 저장을 읽어 시작/이어하기/완료 후 새 판 링크를 표시하며 `round=new`는 완료판에만 새 판을 만들고 즉시 URL에서 소비한다. 진행 중인 저장은 같은 링크로 초기화하지 않는다. `play-modes.css`와 기존 score/site-review/home-motion 브라우저 검사로 확인한다.

- 상·하의 허리는 `avatar-waist.mjs`의 공통 L/F/R 자세로 맞춘다. 모든 top/bottom의 필수 `waist.points/rise`는 보정 전 target 좌표에 등록하며 42px 늘리기 방식은 폐기했다. 목·손목·무릎/발목은 유지한다. `avatar-mesh.mjs`의 작은 화면 겹침과 원단 전용 알파 보정을 유지하고, `avatar-qa-render.mjs`의 실제 원화 표식 검사/잘못된 변환 fixture와 176px 분할선 회귀를 실행한다. 신규 의상은 [허리 피팅 규격](team/briefs/AVATAR-WAIST-FIT.md)을 따른다. 현재 전체 962건/16분할 집계를 확인하고 육안 품질과 자동 결과를 구분한다.

- 제품의 아바타 렌더링은 `avatar-runtime.mjs`의 선택적 비동기 경계를 사용한다. 렌더러 실패가 메뉴·게임·보상 저장을 막지 않게 하고 숨겨진 옷장의 SVG를 미리 그리지 않는다. 캐시된 이전 등록의 누락 필드는 런타임에서 호환하되 신규 의상 QA의 필수 필드는 완화하지 않는다. `tests/avatar-recovery-browser.cjs`로 실패/지연 로드·기록 보존·실제 보상을 검사한다. [진입 복구 기준](team/briefs/AVATAR-RECOVERY.md).

- iOS 반복 종료 대응 이후 제품 아바타는 `avatar-canvas.mjs`의 Canvas 2D만 사용한다. 재귀 SVG 메시/필터를 제품 DOM이나 PNG 내보내기에 되돌리지 않는다. 원본 PNG와 공유 피팅 수학은 유지하며 캐시/표면 픽셀 예산, 직렬 작업, 숨은 화면/pagehide 시 버퍼 해제를 지킨다. Chromium만으로 iPhone 복구를 완료했다고 보고하지 않는다. `avatar-runtime-check.yml`의 WebKit/Chromium 결과와 현재 962개 양쪽 렌더러 검사·전체 집계를 확인한다. [iOS 렌더링 기준](team/briefs/AVATAR-IOS-CANVAS.md).

- 낮은 신발은 `avatar-shoe-fit.mjs`와 registry의 필수 `footFit`으로 좌우 뒤축과 입구를 맞춘다. 실제 발/바짓단은 입구 안에만 복원하고 앞쪽 혀와 테두리, 접촉 그림자를 유지한다. 원본 PNG를 편집하지 않는다. 부츠/발목 회귀와 252개 운동화·하의·피부 조합을 WebKit/Chromium에서 검사하며, 전체 QA는 v3/962개/16분할이다. [신발 피팅 기준](team/briefs/AVATAR-SHOE-FIT.md).

- 3D 제작 시안의 머리·의상·재질은 [2D 애니메이션풍 제작 기준](scripts/avatar-studio/STYLE-GUIDE.md)을 따른다. 주요 부위를 확대해 원화와 비교하고, 패커의 알파·이어짐 검사와 WebKit·Chromium의 코디 8종 검사를 실행한다.
