const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require(process.env.JSDOM_PATH||'jsdom');
const root=path.resolve(__dirname,'../dist'),errors=[];
const v=new VirtualConsole();v.on('jsdomError',e=>errors.push(e));
const dom=new JSDOM(fs.readFileSync(root+'/index.html','utf8'),{url:'https://example.test/',runScripts:'outside-only',virtualConsole:v});
const w=dom.window;w.scrollTo=()=>{};w.eval(['engine.js','content.js','figure6-vector.js','figure6.js','navigation.js','verification.js','app.js'].map(f=>fs.readFileSync(root+'/'+f,'utf8')).join('\n'));
const $=s=>w.document.querySelector(s);const input=(s,v)=>{$(s).value=v;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));};
function page(id){w.history.replaceState({},'',`#${id}`);w.dispatchEvent(new w.HashChangeEvent('hashchange'));assert.ok($('#main').textContent.length>400);}
for(const id of ['intro','physical','timing','link','arbitration','protocols','pec','address','arp','signals','compatibility','verification','reference'])page(id);
page('physical');$('#drain-a').click();assert.match($('#drain-result').textContent,/LOW/);input('#resistor','4400');assert.match($('#rc-result').textContent,/ns/);
page('timing');
assert.equal($('#chapter-select').value,'timing');
assert.equal(w.document.querySelectorAll('.f6-target.selected').length,0);
$('#menu').click();assert.equal($('#chapter-dialog').open,true);assert.equal(w.document.querySelectorAll('#toc-list a').length,13);$('#toc-close').click();assert.equal($('#chapter-dialog').open,false);
for(const p of w.SMB.timing.slice(0,10)){const g=w.document.querySelector('[data-measure="'+p.id+'"]');g.dispatchEvent(new w.Event('pointerenter'));assert.ok($('#f6-detail').textContent.includes(p.id));assert.equal(g.getAttribute('aria-pressed'),'true');assert.equal(w.document.querySelectorAll('[data-range][visibility=visible]').length,1);assert.equal(w.document.querySelector('[data-range][visibility=visible]').dataset.range,p.id);}
$('#f6-speed').selectedIndex=2;$('#f6-speed').dispatchEvent(new w.Event('change'));
w.document.querySelector('[data-pick="tR"]').click();assert.match($('#f6-detail').textContent,/120 ns/);
$('#f6-to-lab').click();assert.equal($('#parameter').value,'tR');assert.equal($('#speed').selectedIndex,2);
$('#f6-zoom').value='150';$('#f6-zoom').dispatchEvent(new w.Event('input'));assert.equal($('#f6-canvas').style.width,'150%');
assert.equal($('#f6-canvas image'),null);
assert.equal(w.document.querySelectorAll('#f6-canvas [data-source-path]').length,139);
assert.equal(w.document.querySelectorAll('#f6-canvas use').length,159);
for(const glyph of w.document.querySelectorAll('#f6-canvas use'))assert.ok(w.document.getElementById(glyph.getAttribute('xlink:href').slice(1)),'Every original glyph must resolve');
assert.equal($('#f6-canvas svg').getAttribute('viewBox'),'63 70.5 667.5 192');
assert.ok(w.document.querySelectorAll('#f6-canvas .f6-clk').length>10);assert.ok(w.document.querySelectorAll('#f6-canvas .f6-dat').length>10);
assert.equal(w.document.querySelectorAll('[data-range][visibility=visible]').length,1);assert.equal(w.document.querySelector('[data-range][visibility=visible]').dataset.range,'tR');
assert.ok(w.document.querySelectorAll('[data-part="tR"].f6-active').length>5);
$('#f6-effects').click();assert.equal($('#f6-effects').getAttribute('aria-pressed'),'false');assert.ok($('.figure6-wrap').classList.contains('f6-quiet'));
fs.writeFileSync('/tmp/smbus-figure6-overlay.svg',$('#f6-canvas').innerHTML);
$('#f6-original').click();assert.equal($('#f6-original-dialog').open,true);
assert.equal($('#f6-original').tagName,'BUTTON');assert.equal($('#f6-original-image').getAttribute('src'),'assets/smbus-3.3-figure6.png');
assert.ok(fs.existsSync(root+'/'+$('#f6-original-image').getAttribute('src')));assert.equal($('#f6-original-dialog a'),null);
$('#f6-original-zoom').click();assert.equal($('#f6-original-zoom').getAttribute('aria-pressed'),'true');assert.ok($('#f6-original-viewport').classList.contains('zoomed'));
$('#f6-original-close').click();assert.equal($('#f6-original-dialog').open,false);assert.equal(w.document.activeElement,$('#f6-original'));
$('#f6-original').click();assert.equal($('#f6-original-zoom').getAttribute('aria-pressed'),'false');
$('#f6-original-dialog').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));assert.equal($('#f6-original-dialog').open,false);

// Every original S/P marker and its corresponding DAT transition explain the condition.
assert.equal(w.document.querySelectorAll('[data-event]').length,4);
for(const id of ['stop-left','start','restart','stop-right']){
 const g=$('[data-event="'+id+'"]');g.dispatchEvent(new w.Event('pointerenter'));
 assert.equal(g.getAttribute('aria-pressed'),'true');assert.equal($('#f6-tooltip').hidden,false);
 assert.match($('#f6-detail').textContent,id.startsWith('stop')?/LOW → HIGH/:/HIGH → LOW/);
 assert.match($('#f6-detail').textContent,/HIGH 유지/);assert.equal($('#f6-detail a[href="#link"]').textContent,'04장 · 비트·START·ACK →');
 assert.equal($('#f6-to-lab').hidden,true);assert.equal(w.document.querySelectorAll('[data-range][visibility=visible]').length,0);
 assert.equal(w.document.querySelectorAll('.f6-event-active').length,2);
 g.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal($('#f6-tooltip').hidden,true);
}
$('[data-event-pick="restart"]').click();assert.match($('#f6-detail').textContent,/STOP 없이/);assert.match($('#f6-detail').textContent,/원문 Figure 6은 이 위치도 S/);
$('#f6-speed').selectedIndex=1;$('#f6-speed').dispatchEvent(new w.Event('change'));assert.match($('#f6-detail').textContent,/Repeated START/);
$('[data-related="tSU:STA"]').click();assert.match($('#f6-detail').textContent,/tSU:STA/);assert.equal($('#f6-to-lab').hidden,false);assert.equal(w.document.querySelectorAll('.f6-event-active').length,0);
$('[data-event="start"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));assert.match($('#f6-detail').textContent,/START · 전송 시작/);
$('[data-pick="tLOW"]').click();assert.equal(w.document.querySelectorAll('[data-event][aria-pressed=true]').length,0);
$('#theme').click();assert.equal(w.document.body.classList.contains('dark'),true);page('physical');assert.equal(w.document.body.classList.contains('dark'),true);page('timing');
$('#timing-fail').click();assert.match($('#timing-explain').textContent,/FAIL/);$('#timing-reset').click();assert.match($('#timing-explain').textContent,/PASS/);
for(const v of ['400 kHz','1 MHz']){$('#speed').value=v;$('#speed').dispatchEvent(new w.Event('change'));assert.match($('#timing-explain').textContent,/PASS/);}
page('protocols');for(const p of w.SMB.protocols){input('#proto',p.id);assert.equal($('#p-error').textContent,'');$('#p-next').click();assert.ok($('#p-wave svg'));}input('#proto','blockRead');input('#p-count','0');assert.equal($('#p-error').textContent,'');input('#p-count','255');assert.equal($('#p-error').textContent,'');input('#p-addr','GG');assert.match($('#p-error').textContent,/주소/);
page('pec');$('#pec-flip').click();assert.match($('#pec-result').textContent,/MISMATCH/);input('#pec-bytes','garbage');assert.match($('#pec-result').textContent,/입력/);
page('address');input('#udid','81081234567800070000000000000001');assert.match($('#udid-result').textContent,/Dynamic volatile/);input('#udid','bad');assert.match($('#udid-result').textContent,/32/);
page('arp');for(let i=0;i<8;i++)$('#arp-next').click();assert.match($('#arp-state').textContent,/해결 완료/);assert.equal($('#arp-next').disabled,true);
page('signals');for(let i=0;i<3;i++)$('#alert-read').click();assert.match($('#alert-state').textContent,/HIGH/);
page('verification');$('[data-check="0"]').click();assert.match($('#check-progress').textContent,/1 \/ 25/);input('#notes','test study note');$('#complete').click();page('intro');page('verification');assert.equal($('#notes').value,'test study note');assert.equal($('[data-check="0"]').checked,true);
input('#search','PEC');assert.ok($('.search-result'));input('#search','<script>bad</script>');assert.equal($('#main script'),null);
assert.equal(errors.length,0,errors.map(e=>e.message).join('\n'));w.close();console.log('DOM: all 13 chapters, inputs, packet modes, validation, ARP/ARA completion and persistence verified.');
