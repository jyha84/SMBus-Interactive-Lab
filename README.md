# SMBus Interactive Lab

SMBus 3.3 전체 장과 부록을 학습하는 한국어 인터랙티브 웹앱입니다.

- 실행: https://smbus-timing-lab.bzbone.chatgpt.site (소유자 전용)
- 소스: https://github.com/jyha84/SMBus-Interactive-Lab (private)
- 기준: [SMBus 3.3, 12 May 2024](https://www.smbus.org/specs/SMBus_3_3_20240512.pdf)
- 학습 구성 참고: [DigitalBook](https://digitalbook.euiyun.com/). 코드를 복제하지 않았습니다.

## 1.1 업데이트

- 항상 보이는 이전/다음 장과 챕터 선택 메뉴, 검색 가능한 전체 목차 팝업
- 원문 Figure 6의 경로·글자 윤곽을 직접 추출한 벡터 파형: 10개 파라미터 hover/touch/focus 설명, 측정 시작·끝, 3개 속도 클래스 min/max
- Figure 6의 S/P 글자와 DAT 전이에 START·STOP·Repeated START 정의, 관련 타이밍 및 4장 바로가기
- 확대·수평 스크롤, 파라미터 버튼, 아래 수치 실험 연결
- 다크 모드 및 기존 학습 기록 유지

## 내용

13개 챕터: 도입 배경·역사, 배선·DC, AC 타이밍, 비트·ACK, 중재·시간 제한, 전체 프로토콜, PEC, 주소·UDID, ARP, 알림·Suspend, I²C 호환성, 검증 체크리스트, 원문 지도·용어·출처.

기능:
- 100 kHz / 400 kHz / 1 MHz 타이밍 한계 비교 및 선택 구간 파형
- Open-drain 토글, RC 상승 시간 계산, 비트·ACK 파형
- 15종 command protocol + Host Notify 생성·단계 재생·PEC 선택
- CRC-8 계산·중간 CRC·데이터 변조 비교
- 비파괴 중재, 3종 timeout/누적 연장 구분
- 128개 주소 지도·wire byte 변환·UDID 해석
- ARP 단계별 주소 할당, SMBALERT# / ARA 중재
- 전체 텍스트 검색, 다크 모드, 모바일 목차
- 브라우저 로컬 학습 진도·장별 노트·25항목 검증 체크리스트
- 파형 SVG, 패킷/타이밍 JSON, 학습 기록 JSON 내보내기

## 실행·개발

외부 런타임 라이브러리나 API 키가 필요 없는 buildless 정적 앱입니다. `dist/index.html`을 브라우저로 열거나 아래처럼 정적 서버로 실행합니다.

```sh
python3 -m http.server 8080 --directory dist
```

배포 대상은 `dist/`입니다. 소스와 배포 파일이 동일합니다. `.openai/hosting.json`은 기존 Sites 식별자와 정적 디렉터리 설정이며 인증정보를 포함하지 않습니다. 같은 사이트를 수정할 때 식별자를 보존하세요. GitHub 저장소 공개 여부와 Sites 접속 권한은 별도입니다. 현재 둘 다 비공개이며 GitHub Pages는 활성화하지 않았습니다.

## 구조

- `dist/engine.js`: CRC, protocol generator, timing facts, arbitration, RC 계산
- `dist/content.js`: 한국어 학습 설명, 절·페이지 출처, 36개 원문 범위 매핑
- `dist/figure6.js`: 원문 좌표의 벡터 파형, 선택 구간 강조와 파라미터 검사
- `dist/navigation.js`: 고정 챕터 이동과 목차 대화상자
- `dist/app.js`: 탐색, SVG 파형, 실험, localStorage
- `dist/style.css`: 반응형·다크 테마
- `tests/engine.test.cjs`: 표준 CRC check vector, 전체 형식, Block 경계, timing 경계
- `tests/dom.test.cjs`: 13개 챕터 렌더, 입력 오류, 실험 진행, 로컬 기록 검증

```sh
node tests/engine.test.cjs
npm install
npm test
```

Node.js 24+ 권장. `npm install`은 DOM 테스트용 jsdom만 설치합니다. 앱 실행에는 필요하지 않습니다.

## 검증 범위와 주의사항

- 계산·구조 테스트 통과: 16개 형식 각각 PEC on/off, 0/1/32/255 Block, CRC `123456789 → F4`, Read Word PEC `16 09 17 34 12 → B8`, 타이밍 경계, 중재와 RC.
- jsdom에서 전 챕터 및 핵심 조작·저장 복원 검증. 실제 브라우저의 픽셀 단위 시각 QA는 수행하지 못했습니다.
- SVG는 측정 관계를 보여주는 개략도입니다. RC는 1차 근사, timing PASS는 개별 스칼라 한계 비교입니다. 공식 compliance suite나 아날로그 시뮬레이터가 아닙니다.
- ARP는 동적 비영속 장치 3개 예제이며, 모든 원문 분기와 장치 기능은 구현하지 않습니다. 예외는 본문·원문 링크를 참고하세요.
- 원문의 ACK 그림 누락, ARA 방향 요약, AR flag 서술 등 상충·오탈자 가능성이 있는 부분은 본문 명령 정의/표를 기준으로 구현했습니다. ARA는 Read=1, 일반 Get UDID는 AR=0이 참여합니다.
- SMBus 3.3 Table 8의 version code는 3.2까지 명시합니다. 3.3.1에서 보완되었으나 이 앱은 요청한 3.3을 기준으로 유지하고 후속판을 별도 링크합니다.
- 3.3의 Block Read/Write count는 0–255이며, 실제 controller/OS 제한은 별도입니다.
- 학습 설명은 원문 전체 장·부록을 다루는 재구성 가이드이며 83쪽 완역은 아닙니다. PMBus ZONE 등 외부 상위 규격의 상세 동작은 범위 밖입니다.

## 데이터·출처

노트·체크리스트·진도는 현재 origin의 localStorage에만 저장되며 서버 전송/기기 동기화는 없습니다. 브라우저 데이터 삭제 시 사라지므로 검증 장에서 JSON으로 내보낼 수 있습니다.

규격 PDF는 저장소에 재배포하지 않고 공식 문서로 링크합니다. 원 규격의 권리는 System Management Interface Forum, Inc.에 있습니다. 역사 보충은 공식 SMBus 3.1 / 3.2 / 3.3.1 Appendix D를 확인했습니다. 새로운 학습 코드·해설·SVG는 본 프로젝트에서 작성했습니다.

### Figure 6 벡터 재생성

`python scripts/extract-figure6.py /path/to/SMBus_3_3_20240512.pdf` (PyMuPDF 필요).
공식 PDF p.18의 139개 도형 경로와 159개 글자 윤곽을 추출합니다. 원래 경로, 변환 행렬, 선 두께 및 점선 패턴을 보존하고 색상만 CSS에서 지정합니다. 배포 앱은 Python이나 원본 PDF 다운로드 없이 동작합니다. `dist/figure6-vector.js`와 `dist/assets/smbus-3.3-figure6.svg`는 생성 결과입니다.
선택한 측정 구간·경계·원문 화살표를 강조하며, 빛 효과 끄기와 reduced-motion 설정을 지원합니다. 원문 PNG 비교 팝업도 유지합니다.

### 회사 PC에서 이어서 개발하기

OpenAI 사이트나 API에 접속하지 않아도 앱 실행·수정이 가능합니다. GitHub 저장소는 private이므로 권한 있는 계정으로 clone하거나 Code → Download ZIP으로 내려받으세요.

1. 전체 저장소를 내려받습니다.
2. `dist/index.html`을 브라우저에서 열거나, Windows에서 `py -m http.server 8080 --directory dist` 실행 후 `http://localhost:8080`에 접속합니다.
3. 사내 웹서버에는 `dist/` 전체를 올립니다. 학습 본문은 `dist/content.js`, 화면·파형 동작은 `dist/app.js`와 `dist/figure6.js`, 디자인은 `dist/style.css`에서 수정합니다.

앱 실행에는 npm 설치, 빌드, API 키, OpenAI 로그인이 필요하지 않습니다. 원문 PDF 링크만 외부 사이트로 연결됩니다. Figure 6 원문 이미지·벡터는 저장소에 포함됩니다. 진도·메모는 브라우저별로 저장되어 자동으로 옮겨지지 않습니다. 필요하면 기존 앱에서 JSON으로 내보내 백업하세요.
