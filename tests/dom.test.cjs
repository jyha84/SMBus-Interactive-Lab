const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.resolve(__dirname,'../dist'),errors=[];
const v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only',virtualConsole:v});
const w=dom.window;w.scrollTo=()=>{};w.eval(['engine.js','content.js','app.js'].map(f=>fs.readFileSync(root+'/'+f,'utf8')).join('\n'));
const $=s=>w.document.querySelector(s);const input=(s,v)=>{$(s).value=v;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
function page(id){w.history.replaceState({},'',`#${id}`);w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.ok($('#main').textContent.length>400);}
for(const id of ['intro','physical','timing','link','arbitration','protocols','pec','address','arp','signals','compatibility','verification','reference'])page(id);
page('physical');$('#drain-a').click();assert.match($('#drain-result').textContent,/LOW/);input('#resistor','4400');assert.match($('#rc-result').textContent,/ns/);
page('timing');$('#timing-fail').click();assert.match($('#timing-explain').textContent,/FAIL/);$('#timing-reset').click();assert.match($('#timing-explain').textContent,/PASS/);
for(const v of ['400 kHz','1 MHz']){$('#speed').value=v;$('#speed').dispatchEvent(new w.Event('change'));assert.match($('#timing-explain').textContent,/PASS/);}
page('protocols');for(const p of w.SMB.protocols){input('#proto',p.id);assert.equal($('#p-error').textContent,'');$('#p-next').click();assert.ok($('#p-wave svg'));}input('#proto','blockRead');input('#p-count','0');assert.equal($('#p-error').textContent,'');input('#p-count','255');assert.equal($('#p-error').textContent,'');input('#p-addr','GG');assert.match($('#p-error').textContent,/주소/);
page('pec');$('#pec-flip').click();assert.match($('#pec-result').textContent,/MISMATCH/);input('#pec-bytes','garbage');assert.match($('#pec-result').textContent,/입력/);
page('address');input('#udid','81081234567800070000000000000001');assert.match($('#udid-result').textContent,/Dynamic volatile/);input('#udid','bad');assert.match($('#udid-result').textContent,/32/);
page('arp');for(let i=0;i<8;i++)$('#arp-next').click();assert.match($('#arp-state').textContent,/해결 완료/);assert.equal($('#arp-next').disabled,true);
page('signals');for(let i=0;i<3;i++)$('#alert-read').click();assert.match($('#alert-state').textContent,/HIGH/);
page('verification');$('[data-check="0"]').click();assert.match($('#check-progress').textContent,/1 \/ 25/);input('#notes','test study note');$('#complete').click();page('intro');page('verification');assert.equal($('#notes').value,'test study note');assert.equal($('[data-check="0"]').checked,true);
input('#search','PEC');assert.ok($('.search-result'));input('#search','<script>bad</script>');assert.equal($('#main script'),null);
assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));w.close();console.log('DOM: all 13 chapters, inputs, packet modes, validation, ARP/ARA completion and persistence verified.');
