'use strict';
// Test procedures below are proposed engineering checks, not an official test suite.
window.SMBVerification = (() => {
  const states = {untested:'미실행',pass:'PASS',fail:'FAIL',blocked:'보류',na:'N/A'};
  const fields = {conditions:'자극·시험 조건',measured:'측정값·실제 동작',evidence:'파형·로그 파일명 / 경로',issue:'이슈 번호',reason:'판정·제외 근거 / 재현 메모'};
  const contextFields = {run:'검증 세트 / 날짜',dut:'시료·보드 / IP revision',firmware:'펌웨어 / 드라이버 버전',role:'DUT 역할·지원 기능',corner:'전압·온도·속도',bus:'Pull-up R·부하·상대 장치',instrument:'스코프·프로브·threshold·skew'};
  // Stable indices preserve the original 25 review checkboxes.
  const guide = [
    ['physical',24,'§4.3 / Tables 3–4','장치의 전기 클래스를 먼저 확인한다. VDD·부하·pull-up 조건을 바꾸며 실제 핀의 HIGH/LOW와 sink 조건을 기록한다.','선택한 전기 클래스와 장치 데이터시트의 한계를 각각 만족하는지 판단한다. 서로 다른 클래스의 수치를 섞지 않는다.'],
    ['physical',26,'§4.3.5','한쪽 장치의 전원만 끈 상태에서 버스 전압과 유입 전류를 계측하고, 다시 켠 뒤 통신을 확인한다.','역급전·powered-off 동작은 해당 핀의 허용 조건과 비교한다. 핀 정격을 넘기는 자극은 사용하지 않는다.'],
    ['physical',18,'§4.2 / Table 2 & notes','R·배선·부하를 바꾸고 CLK/DAT의 rise/fall을 같은 threshold와 프로브 조건에서 반복 측정한다.','지원 속도 및 원문 측정 기준으로 min/max를 비교한다. 프로브 부하와 측정 불확도를 함께 남긴다.'],
    ['timing',18,'§4.2 / Table 2','지원 속도별로 반복 전송을 캡처하고 정상 주기와 stretch 구간을 구별해 주파수·LOW·HIGH 폭을 측정한다.','선택 속도의 각 timing 한계와 비교한다. 평균 주파수만으로 짧은 HIGH/LOW 위반을 놓치지 않는다.'],
    ['timing',18,'Figure 6 / Table 2','Write, Read, combined 거래에서 S·Sr·P와 거래 사이 idle을 캡처하고 각각의 setup/hold 및 tBUF를 측정한다.','START/STOP 정의와 각 측정 구간을 원문에 맞춰 확인한다. Sr 앞에 STOP이 잘못 끼지 않는지도 확인한다.'],
    ['timing',18,'Table 2 & notes','송신 역할을 바꾸어 데이터 패턴을 전송한다. 채널 skew를 보정한 뒤 송신 핀과 수신 핀의 setup/hold를 기록한다.','송신기 책임·수신 조건과 원문 주석을 구분한다. 수치 0만 보고 데이터 전이 순서 확인을 생략하지 않는다.'],
    ['timing',18,'Table 2 & notes','IP에서 지원하는 필터 설정을 확인하고 지정된 pulse 조건 주변에서 잡음 폭을 변화시킨다. 정상 bit가 제거되는지도 확인한다.','속도 클래스와 적용 조건에 따른 spike 규정 및 IP 필터 사양과 비교한다. 미지원 조건은 근거와 함께 N/A로 둔다.'],
    ['link',27,'§5.1–5.2','00/FF/AA/55와 walking bit를 전송한다. 주소·데이터·최종 읽기 바이트에서 ACK/NACK 구동 주체를 캡처한다.','데이터 유효 구간, 9번째 클럭, 정상 읽기 종료 NACK와 오류 NACK를 구별한다.'],
    ['arbitration',30,'§5.3','멀티 controller 지원 시 동시 START와 서로 다른 데이터를 주고, 처음 충돌하는 bit에서 양쪽 핀을 관측한다.','패배 장치의 버스 해제와 승리 거래의 무결성을 확인한다. 재시도 정책은 IP/시스템 사양으로 별도 판단한다.'],
    ['arbitration',17,'§4.2.2 / Table 2','SMBCLK 연속 LOW 폭을 규격 timeout 범위 주변에서 변화시킨다. 해제 후 첫 정상 거래까지 캡처한다.','연속 LOW timeout과 장치 준비 시점의 규정 범위를 확인한다. 누적 clock extension 시험과 구별한다.'],
    ['arbitration',21,'§4.2.4','원문 측정 조건에 맞춰 target만 stretch하도록 구성한다. 한 메시지 안에 연장을 분산해 누적량을 변화시킨다.','정상 LOW 폭을 제외한 target 누적 연장을 규정 한계와 비교하고, 다음 메시지의 누적 상태도 확인한다.'],
    ['arbitration',21,'§4.2.3','Controller의 연장을 한 바이트 구간에 분산시키고 target이 동시에 연장하지 않도록 구성한다.','Controller 누적 연장 한계와 구간 경계를 확인한다. Target 메시지 누적 한계와 혼동하지 않는다.'],
    ['arbitration',22,'§4.2.5','SMBDAT가 LOW에 머무르는 fault를 주입하고 해제한다. 버스 상태·복구 절차·첫 정상 거래를 기록한다.','원문의 권고와 IP의 구현 정책을 나눠 판단한다. 실제 복구시간·수동 reset 필요 여부를 남긴다.'],
    ['protocols',38,'§6.5','지원 command protocol별로 알려진 payload를 전송하고 스코프 decode와 실제 수신 데이터를 대조한다.','주소 R/W, command, byte 순서, Sr, ACK/NACK, STOP이 선택 프로토콜과 맞아야 한다. 지원 목록을 먼저 확정한다.'],
    ['protocols',42,'§6.5.7–6.5.8','지원 범위 내에서 Block 0·1·최대 길이 및 count와 실제 payload가 다른 경우를 시험한다.','규격의 count 범위와 controller/driver/target의 지원 제한을 구별한다. 오류 처리·버퍼 경계·후속 거래를 확인한다.'],
    ['protocols',45,'§6.5.10–6.5.13','32/64비트 전송을 지원하면 서로 다른 byte 값을 사용해 Read/Write를 캡처하고 padding을 포함해 대조한다.','각 프로토콜의 byte 순서와 padding 위치·값을 원문 형식에 맞춰 판단한다.'],
    ['pec',36,'§6.4 / IP register manual','PEC 정상·1 bit 변조·미사용 거래를 섞어 전송한다. 버스 응답, 데이터 반영 여부, IP 오류 상태를 각각 기록한다.','잘못된 PEC의 데이터 처리와 복구를 확인한다. PEC 오류 IRQ·mask·clear는 IP가 제공할 때 레지스터 사양으로 검증한다. SMBus는 공통 CRC IRQ를 정의하지 않는다.'],
    ['pec',37,'§6.4–6.5','Read Word/Process Call 등에서 주소와 R/W를 포함해 전체 CRC를 독립 계산하고 Sr 전후 및 마지막 byte를 캡처한다.','Sr에서 CRC를 잘못 초기화하지 않는지, 최종 NACK 위치가 맞는지 확인한다. Process Call의 쓰기 부분 사전 검증 한계도 구별한다.'],
    ['arp',49,'§6.6.1–6.6.2','ARP 지원 장치의 UDID를 읽고 POR 전후 AR/AV 상태와 PEC를 확인한다. 지원 주소 유형을 기록한다.','UDID 각 필드, 유형별 초기 상태, ARP의 PEC 요구를 원문과 대조한다.'],
    ['arp',54,'§6.6.3','고정·영속·동적 유형별로 일반 및 Directed ARP 명령을 보내고 상태 변화를 추적한다.','각 상태에서 응답 여부와 주소·AR/AV 전이가 원문의 해당 명령 및 상태표에 맞는지 확인한다.'],
    ['arp',60,'§6.6.3 / 시스템 구성','실제 지원 구성에서 주소 충돌, 장치 추가·이탈, 재열거를 재현한다. 여러 enumerator 조건은 지원 시 시험한다.','주소 유일성, 기존 통신 유지, 재열거 후 첫 거래를 기록한다. 시나리오별 기대 동작을 시스템 사양으로 먼저 정한다.'],
    ['signals',44,'§6.5.9 / Appendix A.2 p.73','Host Notify와 SMBALERT#/ARA의 지원 여부를 각각 확인한다. ARA는 여러 pending 장치로 반복 읽기한다.','Host Notify 형식과 ARA 중재·종료·해제를 각각 확인한다. SMBALERT#를 자동 PEC 오류 IRQ와 동일시하지 않는다.'],
    ['signals',72,'Appendix A.1','SMBSUS# 지원 시 suspend/resume과 pull-up 전원 순서를 함께 캡처한다. 전원 유지 조건에서 START wake-up을 시험한다.','시스템별 지원 조건과 원문의 신호 관계를 비교하고, 가짜 START 및 복귀 직후 거래 손실을 확인한다.'],
    ['physical',26,'§4.3.5.2 / tPOR','전원 인가 또는 brownout 복귀를 기준으로 첫 응답 가능한 시간을 측정한다. POR와 단순 버스 timeout 복구를 구별한다.','원문의 tPOR 적용 조건과 장치 reset 사양에 따라 판정하고, 첫 메시지 및 초기 상태를 확인한다.'],
    ['verification',75,'Appendix B / 시스템 검증 계획','전압·온도·속도·보드·상대 장치 조합별로 같은 시험을 반복하고 검증 세트를 따로 내보낸다.','시스템 계획의 필수 조합과 누락 조건을 확인한다. Fail 수정 후 동일 조건과 인접 조건의 회귀 결과를 남긴다.']
  ];
  const idFor = i => `SMB-${String(i+1).padStart(2,'0')}`;
  const isObject = x => x && typeof x === 'object' && !Array.isArray(x);
  const csvCell = value => {
    let s = String(value ?? '');
    if (/^[\s\u0000-\u001f]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g,'""') + '"';
  };
  function mount({host, checks, saved, save, download, esc}) {
    if (!isObject(saved.verification)) saved.verification = {};
    const data = saved.verification;
    if (!isObject(data.context)) data.context = {};
    if (!isObject(data.records)) data.records = {};
    const record = i => {
      const id = idFor(i);
      if (!isObject(data.records[id])) data.records[id] = {status:'untested'};
      if (!Object.hasOwn(states,data.records[id].status)) data.records[id].status = 'untested';
      return data.records[id];
    };
    const statusOptions = selected => Object.entries(states).map(([v,label])=>`<option value="${v}" ${v===selected?'selected':''}>${label}</option>`).join('');
    host.innerHTML = `<section class="verify-workspace"><div class="verify-heading"><div class="eyebrow">POST-SILICON WORKSPACE</div><h2>규격에서 측정으로</h2><p>방법을 확인하고, 실측 증거를 남기고, 판정하세요. 체크 표시와 PASS는 별도로 기록합니다.</p></div><div class="verify-summary" id="verify-summary" role="status"></div><details class="verify-context" open><summary>현재 검증 세트 · 환경 기록</summary><div class="verify-fields">${Object.entries(contextFields).map(([key,label])=>`<label>${label}<input type="text" data-context="${key}" maxlength="2000" value="${esc(data.context[key]||'')}" placeholder="${key==='run'?'예: Board A / room / 400k / 2026-10-17':'실제 시험 조건을 입력하세요'}"></label>`).join('')}</div><p class="hint">한 세트에는 같은 시험 환경의 결과를 기록하세요. 환경을 바꾸기 전 JSON/CSV로 저장해 이력을 남기세요. 파일명·경로는 텍스트로만 보관하며 파일을 업로드하지 않습니다.</p></details><div class="toolbar verify-tools"><label>범주<select id="verify-category"><option value="">전체</option>${[...new Set(checks.map(c=>c[0]))].map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label>판정<select id="verify-status"><option value="">전체</option>${statusOptions('')}</select></label><label class="verify-search">검증 항목 검색<input id="verify-search" type="text" placeholder="PEC, timeout, 측정값…"></label></div><div class="toolbar"><button class="btn primary" id="check-export">기록 JSON 저장</button><button class="btn" id="verify-csv">Excel용 CSV 저장</button><button class="btn" id="verify-import">JSON 병합 가져오기</button><input type="file" id="verify-file" accept="application/json,.json" hidden></div><p class="hint">가져오기는 포함된 환경·항목 기록을 덮어씁니다. 포함되지 않은 항목과 학습 노트는 유지합니다. 먼저 현재 JSON을 저장하세요.</p><p id="verify-message" role="status"></p><div class="row"><span id="check-progress"></span><span id="verify-visible" class="hint"></span></div><div id="verify-list">${checks.map(([category,title],i)=>{
      const r=record(i),g=guide[i],id=idFor(i);
      return `<details class="verify-case" data-case="${i}" data-status="${r.status}"><summary><span class="verify-case-id">${id} · ${esc(category)}</span><span class="verify-case-title">${esc(title)}</span><span class="status verify-badge">${states[r.status]}</span></summary><div class="verify-method"><div><h3>시험 방법</h3><p>${esc(g[3])}</p></div><div><h3>판정 시 확인할 것</h3><p>${esc(g[4])}</p></div></div><p class="ref"><a href="#${g[0]}">관련 학습 챕터 →</a> · <a href="${SMB.PDF}#page=${g[1]}" target="_blank" rel="noopener">SMBus 3.3 ${esc(g[2])} · p.${g[1]} ↗</a></p><div class="verify-fields"><label>판정<select data-result="${i}">${statusOptions(r.status)}</select></label>${Object.entries(fields).map(([key,label])=>`<label class="${key==='reason'?'verify-wide':''}">${label}<textarea data-record="${i}" data-field="${key}" maxlength="20000" rows="2" placeholder="${key==='reason'?'PASS/FAIL 근거 또는 N/A·보류 이유를 기록하세요':''}">${esc(r[key]||'')}</textarea></label>`).join('')}</div><label class="verify-reviewed"><input type="checkbox" data-check="${i}" ${saved.checks.includes(i)?'checked':''}> 검토 완료 (시험 합격 판정과 별개)</label></details>`;
    }).join('')}</div><p id="verify-empty" hidden>조건에 맞는 검증 항목이 없습니다.</p></section>`;
    const find = s => host.querySelector(s);
    const all = s => host.querySelectorAll(s);
    const stamp = r => {r.updatedAt=new Date().toISOString();save();};
    function refresh() {
      const counts = Object.fromEntries(Object.keys(states).map(s=>[s,0]));
      checks.forEach((_,i)=>counts[record(i).status]++);
      find('#verify-summary').innerHTML = Object.entries(states).map(([s,label])=>`<div data-summary="${s}"><strong>${counts[s]}</strong><span>${label}</span></div>`).join('');
      find('#check-progress').textContent = `${saved.checks.filter(i=>Number.isInteger(i)&&i>=0&&i<checks.length).length} / ${checks.length}개 검토`;
      const category=find('#verify-category').value,status=find('#verify-status').value,q=find('#verify-search').value.trim().toLowerCase();
      let visible=0;
      all('[data-case]').forEach(el=>{
        const i=+el.dataset.case,r=record(i);
        el.dataset.status=r.status;
        el.querySelector('.verify-badge').textContent=states[r.status];
        const haystack=[idFor(i),...checks[i],...guide[i],...Object.values(r)].join(' ').toLowerCase();
        el.hidden=!!((category&&checks[i][0]!==category)||(status&&r.status!==status)||(q&&!haystack.includes(q)));
        if(!el.hidden)visible++;
      });
      find('#verify-visible').textContent=`${visible}개 표시 / ${checks.length}개 전체`;
      find('#verify-empty').hidden=visible!==0;
    }
    all('[data-context]').forEach(el=>el.oninput=()=>{data.context[el.dataset.context]=el.value;save();});
    all('[data-record]').forEach(el=>el.oninput=()=>{const r=record(+el.dataset.record);r[el.dataset.field]=el.value;stamp(r);});
    all('[data-result]').forEach(el=>el.onchange=()=>{const r=record(+el.dataset.result);r.status=el.value;stamp(r);refresh();});
    all('[data-check]').forEach(el=>el.onchange=()=>{const i=+el.dataset.check;saved.checks=el.checked?[...new Set([...saved.checks,i])]:saved.checks.filter(x=>x!==i);save();refresh();});
    ['#verify-category','#verify-status'].forEach(s=>find(s).onchange=refresh);
    find('#verify-search').oninput=refresh;
    find('#check-export').onclick=()=>download('smbus-verification.json',JSON.stringify({schema:'smbus-verification-v1',spec:'3.3',exported:new Date().toISOString(),verification:data,checklist:checks.map(([category,item],i)=>({id:idFor(i),category,item,checked:saved.checks.includes(i)})),notes:saved.notes,completedChapters:saved.done},null,2),'application/json');
    find('#verify-csv').onclick=()=>{
      const headings=['ID','범주','항목','판정','검토 완료',...Object.values(contextFields),'시험 방법','판정 기준','규격 근거',...Object.values(fields),'수정 시간'];
      const rows=checks.map(([category,title],i)=>{const r=record(i),g=guide[i];return [idFor(i),category,title,states[r.status],saved.checks.includes(i)?'Y':'N',...Object.keys(contextFields).map(k=>data.context[k]||''),g[3],g[4],`${g[2]} / ${SMB.PDF}#page=${g[1]}`,...Object.keys(fields).map(k=>r[k]||''),r.updatedAt||''];});
      download('smbus-verification.csv','\ufeff'+[headings,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    };
    find('#verify-import').onclick=()=>find('#verify-file').click();
    find('#verify-file').onchange=async event=>{
      const file=event.target.files[0];if(!file)return;
      try {
        if(file.size>2*1024*1024)throw Error('2 MB 이하의 기록 JSON을 선택하세요.');
        const incoming=JSON.parse(await file.text());
        const parsed=parseImport(incoming,checks);
        Object.assign(data.context,parsed.context);
        Object.entries(parsed.records).forEach(([id,r])=>{data.records[id]=r;});
        parsed.reviewed.forEach(([i,checked])=>{saved.checks=checked?[...new Set([...saved.checks,i])]:saved.checks.filter(x=>x!==i);});
        save();mount({host,checks,saved,save,download,esc});
        host.querySelector('#verify-message').textContent='검증 기록을 가져왔습니다. 학습 노트와 챕터 진도는 유지했습니다.';
      } catch(error) {find('#verify-message').textContent='가져오기 실패: '+error.message;event.target.value='';}
    };
    refresh();
  }
  function parseImport(x,checks) {
    if(!isObject(x)||x.spec!=='3.3')throw Error('SMBus 3.3 기록 파일이 아닙니다.');
    const context={},records={},reviewed=[];
    const copyText=(source,keys,target)=>keys.forEach(key=>{if(Object.hasOwn(source,key)){if(typeof source[key]!=='string'||source[key].length>20000)throw Error('잘못된 텍스트 필드입니다.');target[key]=source[key];}});
    if(x.schema==='smbus-verification-v1') {
      if(!isObject(x.verification)||!isObject(x.verification.context)||!isObject(x.verification.records))throw Error('검증 기록 구조가 올바르지 않습니다.');
      copyText(x.verification.context,Object.keys(contextFields),context);
      Object.entries(x.verification.records).forEach(([id,r])=>{
        if(!checks.some((_,i)=>idFor(i)===id)||!isObject(r)||!Object.hasOwn(states,r.status))throw Error('알 수 없는 검증 ID 또는 판정입니다.');
        const clean={status:r.status};copyText(r,[...Object.keys(fields),'updatedAt'],clean);records[id]=clean;
      });
    } else if(x.schema!==undefined||!Array.isArray(x.checklist))throw Error('지원하는 기록 형식이 아닙니다.');
    if(x.checklist!==undefined) {
      if(!Array.isArray(x.checklist))throw Error('체크리스트 형식이 올바르지 않습니다.');
      x.checklist.forEach(c=>{
        if(!isObject(c)||typeof c.checked!=='boolean')throw Error('검토 기록이 올바르지 않습니다.');
        const i=checks.findIndex(([category,item],i)=>(c.id===undefined||idFor(i)===c.id)&&c.category===category&&c.item===item);
        if(i<0)throw Error('일치하지 않는 체크리스트 항목입니다.');
        reviewed.push([i,c.checked]);
      });
    }
    return {context,records,reviewed};
  }
  return {mount,parseImport,csvCell};
})();
