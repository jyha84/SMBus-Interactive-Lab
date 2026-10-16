/* Pure calculation layer. Numeric timing facts: SMBus 3.3 Table 2, pp.18–20. */
(function(root){
'use strict';
const PDF='https://www.smbus.org/specs/SMBus_3_3_20240512.pdf';
const timing=[
['tBUF','STOP → 다음 START', 'µs',[4.7,1.3,.5],null,'버스가 해제된 뒤 다음 START까지 확보하는 시간.'],
['tHD:STA','START hold','µs',[4,.6,.26],null,'SMBDAT가 LOW로 내려가 START를 만든 뒤 SMBCLK를 LOW로 내리기 전까지.'],
['tSU:STA','Repeated START setup','µs',[4.7,.6,.26],null,'SMBCLK가 HIGH가 된 뒤 repeated START의 SMBDAT 하강 전까지.'],
['tSU:STO','STOP setup','µs',[4,.6,.26],null,'SMBCLK HIGH 이후 SMBDAT 상승으로 STOP을 만들기 전까지.'],
['tHD:DAT','Data hold','ns',[0,0,0],null,'송신 장치가 보장한다. 해당 장치의 SMBCLK가 VIL,max 아래가 되기 전에 SMBDAT가 유효 상태를 벗어나면 안 된다.'],
['tSU:DAT','Data setup','ns',[250,100,50],null,'SMBCLK 상승의 유효 판정 전까지 데이터가 안정되어 있어야 하는 시간.'],
['tLOW','Clock LOW','µs',[4.7,1.3,.5],null,'SMBCLK가 LOW인 구간. 주파수만 맞아도 이 구간이 짧으면 위반할 수 있다.'],
['tHIGH','Clock HIGH','µs',[4,.6,.26],[50,50,50],'데이터가 안정되어야 하는 HIGH 구간. 상한 50 µs는 idle 검출과도 연결된다.'],
['tR','Rise time','ns',null,[1000,300,120],'VIL,max−0.15 V에서 VIH,min+0.15 V까지 측정. SMBus의 고정 임계값을 적용하면 0.65→1.50 V.'],
['tF','Fall time','ns',null,[300,300,120],'VIH,min+0.15 V에서 VIL,max−0.15 V까지 측정. 1.50→0.65 V.'],
['tTIMEOUT','Clock LOW timeout','ms',[25,25,25],[35,35,35],'일반 펄스의 허용 폭이 아니다. 25 ms 초과에서 timeout을 판단할 수 있고, 검출 장치는 35 ms까지 새 START를 받을 수 있어야 한다.'],
['tLOW:TEXT','Target 누적 연장','ms',null,[25,25,25],'한 target이 START부터 STOP까지 연장한 시간의 합. 정상 LOW 시간 자체의 합이 아니다.'],
['tLOW:CEXT','Controller 누적 연장','ms',null,[10,10,10],'한 controller가 START→ACK, ACK→ACK, ACK→STOP 각 구간에서 연장한 시간의 합.'],
['tSPIKE','Noise spike rejection','ns',[null,0,0],[null,50,50],'400 kHz / 1 MHz 장치는 50 ns까지의 스파이크를 제거할 수 있어야 한다. 100 kHz 칸은 미규정.'],
['tPOR','Power-on operational','ms',null,[500,500,500],'정상 전원 공급 이후 operational 상태가 되어야 하는 최대 시간.']
].map(([id,name,unit,min,max,desc])=>({id,name,unit,min,max,desc}));
function crc8(bytes){let crc=0;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=((crc&128)?(crc<<1)^7:crc<<1)&255;}return crc;}
function crcTrace(bytes){let a=[],r=0;for(const b of bytes){r=crc8Continue(r,b);a.push(r);}return a;}
function crc8Continue(c,b){c^=b;for(let i=0;i<8;i++)c=((c&128)?(c<<1)^7:c<<1)&255;return c;}
function hex(n,width=2){return n.toString(16).toUpperCase().padStart(width,'0');}
function parseBytes(str){const a=str.trim().split(/[\s,]+/).filter(Boolean);if(!a.length||a.some(x=>! /^(?:0x)?[0-9a-f]{1,2}$/i.test(x)))throw Error('각 바이트를 00–FF 범위의 16진수로 입력하세요. 예: 16 09 17 34 12');return a.map(x=>parseInt(x,16));}
const protocols=[
['quick','Quick Command',38,'R/W 비트 자체가 1비트 명령이다. command/data/PEC가 없다.'],
['send','Send Byte',39,'command 필드 없이 한 바이트를 보낸다.'],['receive','Receive Byte',39,'command 전송 없이 target에서 한 바이트를 읽는다.'],
['writeByte','Write Byte',39,'8비트 command 뒤에 한 바이트를 쓴다.'],['writeWord','Write Word',39,'16비트 값은 LOW byte부터 전송한다. 각 바이트 안에서는 MSB first.'],
['readByte','Read Byte',40,'command를 쓴 뒤 repeated START로 방향을 바꾸어 한 바이트를 읽는다.'],['readWord','Read Word',40,'LOW byte, HIGH byte 순서로 읽는다. 마지막 읽기 바이트는 controller가 NACK한다.'],
['process','Process Call',41,'16비트 값을 쓰고 STOP 없이 16비트 응답을 읽는다. PEC는 전체 패킷에 대해 한 번 계산한다.'],
['blockWrite','Block Write',42,'count 뒤에 0–255개 데이터 바이트를 쓴다. count에 PEC는 포함하지 않는다.'],['blockRead','Block Read',42,'target이 count를 돌려주고 그만큼 데이터를 보낸다. 3.3에서는 0–255바이트를 허용한다.'],
['blockProcess','Block Write–Block Read Process Call',43,'쓰기 M바이트와 읽기 N바이트를 한 메시지로 교환한다. M≥0, N≥0, M+N≤255.'],
['write32','Write 32',45,'4바이트 고정 전송. 짧은 값은 상위 비트를 0으로 채운다.'],['read32','Read 32',45,'4바이트 고정 읽기. byte 1은 bits[7:0].'],
['write64','Write 64',46,'8바이트 고정 전송. 유효 데이터보다 높은 비트는 0으로 채운다.'],['read64','Read 64',47,'8바이트 고정 읽기. byte 순서는 little-endian, 각 byte의 bit 순서는 MSB first.'],
['host','Host Notify',44,'장치가 controller 역할로 Host(0x08)에 자기 주소와 16비트 상태를 보낸다. PEC 변형은 없다.']
].map(([id,name,page,desc])=>({id,name,page,desc}));
function packet(id,o={}){
const addr=o.addr??0x0b, cmd=o.cmd??0x09, data=o.data??[0x34,0x12,0x56,0x78,0x9a,0xbc,0xde,0xf0],count=o.count??3,rcount=o.rcount??2;
const pec=!!o.pec&&!['quick','host'].includes(id),p=[],bytes=[];
const marker=(label)=>p.push({label,kind:'event',owner:'Controller'});
const byte=(label,value,owner='Controller',ack='ACK')=>{bytes.push(value);p.push({label,value,owner,kind:'byte'});p.push({label:ack,kind:'ack',owner:owner==='Controller'?'Target':'Controller',value:ack==='ACK'?0:1});};
const address=(read)=>byte('Address + '+(read?'R':'W'),(addr<<1)|(read?1:0));
const writeData=(n)=>{for(let i=0;i<n;i++)byte('Data '+(i+1),data[i%data.length]);};
const readData=(n)=>{for(let i=0;i<n;i++)byte('Data '+(i+1),data[i%data.length],'Target',i===n-1&&!pec?'NACK':'ACK');};
let reading=false;marker('START');
if(id==='host'){byte('Host + W',0x10);byte('Device address',addr<<1);writeData(2);}
else if(id==='quick'){address(!!o.quickRead);}
else if(id==='send'){address(false);byte('Data',data[0]);}
else if(id==='receive'){address(true);reading=true;readData(1);}
else{address(false);byte('Command',cmd);
 if(['writeByte','writeWord','write32','write64'].includes(id))writeData({writeByte:1,writeWord:2,write32:4,write64:8}[id]);
 else if(id==='blockWrite'){byte('Count',count);writeData(count);}
 else {
 if(id==='process')writeData(2);
 if(id==='blockProcess'){if(count+rcount>255)throw Error('M + N은 255 이하여야 합니다.');byte('Write count',count);writeData(count);}
 marker('RESTART');address(true);reading=true;
 const n=id==='blockRead'?count:id==='blockProcess'?rcount:({readByte:1,readWord:2,process:2,read32:4,read64:8}[id]);
 if(['blockRead','blockProcess'].includes(id))byte('Read count',n,'Target',n===0&&!pec?'NACK':'ACK');
 readData(n);
 }
}
const crc=crc8(bytes);if(pec)byte('PEC',crc,reading?'Target':'Controller',reading?'NACK':'ACK');marker('STOP');return {tokens:p,bytes:pec?bytes.slice(0,-1):bytes,crc,pec};
}
function judge(param,c,value){if(!Number.isFinite(value))return 'invalid';const lo=param.min?.[c],hi=param.max?.[c];if(lo==null&&hi==null)return 'unspecified';return (lo!=null&&value<lo)||(hi!=null&&value>hi)?'fail':'pass';}
function rcRise(r,c,vdd=3.3){return r*c*.001*Math.log((vdd-.65)/(vdd-1.5));} // Ω, pF → ns
function arbitration(a,b){let aliveA=true,aliveB=true,loss=-1,winner='동일';const rows=[];for(let i=7;i>=0;i--){const aa=(a>>i)&1,bb=(b>>i)&1,bus=(aliveA?aa:1)&(aliveB?bb:1);if(aliveA&&aa>bus){aliveA=false;loss=7-i;winner='B';}if(aliveB&&bb>bus){aliveB=false;loss=7-i;winner='A';}rows.push({a:aa,b:bb,bus,aliveA,aliveB});}return {rows,loss,winner};}
root.SMB={PDF,timing,crc8,crcTrace,hex,parseBytes,protocols,packet,judge,rcRise,arbitration};
})(typeof window!=='undefined'?window:globalThis);
