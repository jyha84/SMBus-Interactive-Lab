const assert=require('node:assert/strict');require('../dist/engine.js');const S=globalThis.SMB;
assert.equal(S.crc8([...Buffer.from('123456789')]),0xf4,'CRC-8 check vector');
assert.equal(S.crc8([0x16,0x09,0x17,0x34,0x12]),0xb8,'SMBus read word PEC');
assert.deepEqual(S.packet('readWord',{pec:false}).tokens.filter(t=>t.kind==='byte').map(t=>t.value),[0x16,9,0x17,0x34,0x12]);
for(const p of S.protocols){for(const pec of [false,true]){let r=S.packet(p.id,{pec});assert.equal(r.tokens[0].label,'START');assert.equal(r.tokens.at(-1).label,'STOP');for(let i=0;i<r.tokens.length;i++){if(r.tokens[i].kind==='byte')assert.equal(r.tokens[i+1].kind,'ack');}assert.equal(r.pec,pec&&!['host','quick'].includes(p.id));if(r.pec)assert.equal(r.tokens.at(-3).value,S.crc8(r.bytes));}}
for(const count of [0,1,32,255]){for(const p of ['blockRead','blockWrite']){let r=S.packet(p,{count,pec:false});let bytes=r.tokens.filter(t=>t.kind==='byte');assert.equal(bytes.length,count+(p==='blockRead'?4:3));if(p==='blockRead')assert.equal(r.tokens.at(-2).label,'NACK');}}
assert.throws(()=>S.packet('blockProcess',{count:254,rcount:2}));
assert.equal(S.packet('host',{pec:true}).tokens.filter(t=>t.kind==='byte')[0].value,0x10);
assert.equal(S.arbitration(0xa6,0xa2).winner,'B');assert.equal(S.arbitration(0xa6,0xa2).loss,5);
for(let c=0;c<3;c++){for(const p of S.timing.slice(0,10)){const lo=p.min?.[c],hi=p.max?.[c];if(lo!=null){assert.equal(S.judge(p,c,lo),'pass');assert.equal(S.judge(p,c,lo-0.001),'fail');}if(hi!=null){assert.equal(S.judge(p,c,hi),'pass');assert.equal(S.judge(p,c,hi+0.001),'fail');}}}
assert.ok(S.rcRise(2200,100)>0);assert.equal(S.rcRise(4400,100),2*S.rcRise(2200,100));
console.log('Engine: CRC vectors, all 16 formats with/without PEC, block boundaries, timing limits, arbitration and RC verified.');
