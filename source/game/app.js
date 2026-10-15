'use strict';
const $=id=>document.getElementById(id),game=new SafariBattle(Date.now()>>>0),canvas=$('canvas'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const ASSET=window.SAFARI_ASSETS||{};
const asset=n=>ASSET[n]||'assets/'+n;
const sprites={};for(const n of ['safari-atlas.png','camera-atlas.png','orb-atlas.png']){const im=new Image();im.src=asset(n);sprites[n]=im;}
if(ASSET['forest.mp4'])$('forest').src=asset('forest.mp4');if(ASSET['poster.png'])$('forest').poster=asset('poster.png');
let paused=false,last=0,clock=0,uiKey='',scale=1,shake=0,bossHit=0,chatter=0,joy={x:0,y:0},pointer=null,keys=new Set(),best=null;
try{best=JSON.parse(localStorage.getItem('safari-best-v1')||'null');}catch(e){}
if(best)$('best').textContent=`ЛУЧШИЙ КАДР: ${best.rank} • ${best.hits} попаданий • ${best.time} с`;
class Sound{
 constructor(){
  this.music=new Audio(asset('music.mp3'));this.music.loop=true;this.music.preload='auto';this.music.volume=.55;
  this.fx=.65;this.ctx=null;this.buffers={};this.source=null;this.offset=0;this.started=0;this.wanted=false;this.loading=null;this.failed=false;this.voices=new Set();
  this.pool={flash:new Audio(asset('flash.mp3')),swing:new Audio(asset('swing.mp3'))};
 }
 status(label,error=false){$('audioStatus').textContent=label;$('audioBtn').textContent=error?'♪ !':'♪';$('audioBtn').title=label;}
 async bytes(name){const url=asset(name);if(url.startsWith('data:')){const binary=atob(url.slice(url.indexOf(',')+1));return Uint8Array.from(binary,c=>c.charCodeAt(0)).buffer;}const r=await fetch(url);if(!r.ok)throw Error('Audio '+r.status);return r.arrayBuffer();}
 prepare(){
  if(this.loading)return this.loading;
  this.loading=Promise.all(['music','flash','swing'].map(async n=>{try{const bytes=await this.bytes(n+'.mp3');this.buffers[n]=await this.ctx.decodeAudioData(bytes);if(n==='music')this.startMusic();}catch(e){if(n==='music'){this.failed=true;this.fallback();}this.status('Не удалось загрузить звук. Нажми «Проверить звук».',true);}}));return this.loading;
 }
 unlock(){
  this.wanted=true;
  try{if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)throw Error('No Web Audio');this.ctx=new C();this.musicGain=this.ctx.createGain();this.musicGain.gain.value=this.music.volume;this.musicGain.connect(this.ctx.destination);this.prepare();}
   const resume=this.ctx.resume();if(resume&&resume.then)resume.then(()=>this.startMusic()).catch(()=>this.status('Браузер остановил звук. Нажми ♪.',true));this.startMusic();
   if(this.failed)this.fallback();
  }catch(e){this.failed=true;this.fallback();}
 }
 startMusic(){if(!this.wanted||!this.ctx||this.ctx.state!=='running'||!this.buffers.music||this.source)return;
  this.music.pause();const src=this.ctx.createBufferSource();src.buffer=this.buffers.music;src.loop=true;src.connect(this.musicGain);this.offset%=src.buffer.duration;this.started=this.ctx.currentTime;src.start(0,this.offset);this.source=src;this.status('Играет: portrait_of_a_rival');
 }
 fallback(){if(!this.wanted)return;this.music.muted=false;const p=this.music.play();if(p&&p.then)p.then(()=>{if(!this.wanted)this.music.pause();else this.status('Играет: portrait_of_a_rival');}).catch(()=>this.status('Звук заблокирован браузером. Нажми ♪ для включения.',true));}
 volume(v){this.music.volume=v;if(this.musicGain)this.musicGain.gain.value=v;}
 reset(){this.stop();this.offset=0;this.music.currentTime=0;}
 tone(f=500,d=.08,type='square',vol=.07){if(!this.ctx||this.ctx.state!=='running'||!this.fx||paused)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f*.7),t+d);g.gain.setValueAtTime(vol*this.fx,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+d);}
 play(n){if(paused)return;if(this.ctx&&this.ctx.state==='running'&&this.buffers[n]){const src=this.ctx.createBufferSource(),gain=this.ctx.createGain();src.buffer=this.buffers[n];gain.gain.value=this.fx;src.connect(gain);gain.connect(this.ctx.destination);this.voices.add(src);src.onended=()=>{this.voices.delete(src);gain.disconnect();};src.start();return;}const a=this.pool[n];if(a){a.pause();a.currentTime=0;a.volume=this.fx;const p=a.play();if(p&&p.catch)p.catch(()=>this.status('Нажми ♪, чтобы разрешить звуковые эффекты.',true));}}
 stop(){this.wanted=false;if(this.source){this.offset+=this.ctx.currentTime-this.started;this.source.stop();this.source.disconnect();this.source=null;}this.music.pause();for(const src of this.voices){src.stop();}this.voices.clear();for(const a of Object.values(this.pool))a.pause();}
}
const sound=new Sound();
// Measure the visible viewport, not an overflow-inflated layout viewport.
function viewportFit(width,height,left=0,top=0){const k=Math.min(width/960,height/540);return {scale:k,x:left+(width-960*k)/2,y:top+(height-540*k)/2};}
function resize(){
 const vv=window.visualViewport,root=document.documentElement;
 const width=Math.min(root.clientWidth||innerWidth,vv?.width||innerWidth),height=Math.min(root.clientHeight||innerHeight,vv?.height||innerHeight);
 const fit=viewportFit(width,height,vv?.offsetLeft||0,vv?.offsetTop||0);scale=fit.scale;
 $('stage').style.left='0px';$('stage').style.top='0px';$('stage').style.transform=`translate(${fit.x}px,${fit.y}px) scale(${scale})`;
 if(height>width&&!document.body.classList.contains('allowPortrait')&&game.state!=='title'&&game.state!=='ending')setPause(true);
}
addEventListener('resize',resize);addEventListener('orientationchange',()=>{resize();setTimeout(resize,200);});
window.visualViewport?.addEventListener('resize',resize);window.visualViewport?.addEventListener('scroll',resize);
document.addEventListener('fullscreenchange',resize);resize();
function resetInput(){joy={x:0,y:0};pointer=null;keys.clear();$('knob').style.transform='';}
function begin(){paused=false;game.start();uiKey='';resetInput();sound.reset();sound.unlock();$('forest').play().catch(()=>{});sync();}
function setPause(value){if(game.state==='title'||game.state==='ending')return;paused=value;resetInput();$('pause').hidden=!value;if(value){sound.stop();$('forest').pause();}else{sound.unlock();$('forest').play().catch(()=>{});}last=performance.now();}
function menu(){game.reset();paused=false;resetInput();sound.stop();$('pause').hidden=true;uiKey='';sync();}
$('start').onclick=begin;$('again').onclick=begin;$('menuBtn').onclick=menu;$('restart').onclick=menu;$('pauseBtn').onclick=()=>setPause(!paused);$('resume').onclick=()=>setPause(false);
$('musicVol').oninput=e=>sound.volume(+e.target.value/100);$('sfxVol').oninput=e=>sound.fx=+e.target.value/100;
$('fullBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else document.documentElement.requestFullscreen?.().catch(()=>{});};
$('audioBtn').onclick=()=>{if(paused)setPause(false);else if(game.ending)sound.tone(600,.2,'triangle');else sound.unlock();};
$('testAudio').onclick=()=>{setPause(false);sound.unlock();sound.play('flash');};
document.addEventListener('pointerdown',()=>{if(!paused&&!game.ending&&game.state!=='title')sound.unlock();},{passive:true});
$('portrait').onclick=()=>{document.body.classList.add('allowPortrait');resize();};
$('continue').onclick=()=>{game.advance();sound.tone(370,.035);sync();};
$('dash').onpointerdown=e=>{e.preventDefault();if(!paused)game.dodge();};
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{if(!paused){game.choose(b.dataset.action);sound.tone();sync();}});
function button(text,fn,disabled=false,wide=false){const b=document.createElement('button');b.textContent=text;b.disabled=disabled;if(wide)b.className='wide';b.onclick=()=>{if(paused)return;sound.tone(460,.04);fn();sync();};$('choices').appendChild(b);}
function description(text){const p=document.createElement('p');p.className='description';p.textContent=text;$('choices').appendChild(p);}
function buildUI(){const c=$('choices');c.replaceChildren();if(game.state==='menu'){description(game.affinity>=4&&game.finalSurvived?'Камера опущена. Сафари ждёт твоего решения.':'* Сафари ищет лучший ракурс.');description('Выбери действие внизу.');if(game.used.has('camera'))description('«Лучший кадр — когда фотограф тоже в нём».');}
 if(game.state==='act'){for(const [id,label] of game.actOptions())button((game.used.has(id)?'✓ ':'')+label,()=>game.act(id));button('← Назад',()=>game.state='menu');}
 if(game.state==='item'){const items=['Шоколад • +20 HP','Чай • +30 HP','Пирожное • +15 HP, щит ×3'];items.forEach((n,i)=>button(n+' ×'+game.items[i],()=>game.item(i),!game.items[i],true));button('← Назад',()=>game.state='menu',false,true);}
 if(game.state==='fight'){c.style.background='transparent';description('Нажми, когда метка в центре');const b=document.createElement('div');b.style.height='56px';b.className='wide';c.append(b);button('УДАРИТЬ  [ENTER]',()=>game.strike(),false,true);}else c.style.background='';
 if(game.state==='dialogue'){description(game.ending?'* Листья медленно опускаются на землю.':'* На поляне пахнет осенью и проявителем.');button('Продолжить разговор  ▸',()=>game.advance(),false,true);}
 if(game.state==='ending'){const names={fight:'Победа • Хорошая выдержка',peace:'Мир • Без вспышки',secret:'Секрет • Вместе в кадре',loss:'Нужен ещё один дубль'};const text={fight:'Сафари признала поражение. Камера цела. Чай уже заваривается.',peace:'Фотосессия закончилась дружбой. Иногда достаточно выслушать.',secret:'На конкурс отправилась фотография двух друзей. Никакой ретуши.',loss:'Сафари принесла чай. Можно попробовать снова — плёнки хватит.'};$('endTitle').textContent=names[game.ending];$('endText').textContent=text[game.ending];const rank=game.ending==='loss'?'—':game.hits===0?'S':game.hits<5?'A':game.hits<10?'B':'C';const time=Math.floor(game.elapsed);$('stats').innerHTML=`<span>Время <b>${Math.floor(time/60)}:${String(time%60).padStart(2,'0')}</b></span><span>Здоровье <b>${game.hp} / 60</b></span><span>Попадания <b>${game.hits}</b></span><span>Ранг <b>${rank}</b></span>`;if(game.ending!=='loss'&&(!best||game.hits<best.hits||(game.hits===best.hits&&time<best.time))){best={rank,hits:game.hits,time,ending:game.ending};try{localStorage.setItem('safari-best-v1',JSON.stringify(best));}catch(e){}}if(best)$('best').textContent=`ЛУЧШИЙ КАДР: ${best.rank} • ${best.hits} попаданий • ${best.time} с`;}
}
function sync(){const s=game.state;const key=s+':'+(s==='ending'?game.ending:'')+':'+game.turn;if(key!==uiKey){uiKey=key;buildUI();}
 $('title').hidden=s!=='title';$('result').hidden=s!=='ending';$('speech').hidden=s==='title'||s==='ending';$('bossInfo').hidden=s==='title'||s==='ending';$('actions').hidden=s==='title'||s==='ending';$('choices').hidden=s==='title'||s==='ending';$('status').hidden=s==='title'||s==='ending';
 $('speechText').textContent=s==='dialogue'?game.lines[game.line].slice(0,Math.floor(game.textAge/.025)):s==='dodge'?SafariAttacks[game.pattern][1]:s==='fight'?'Так, а это у нас художественная критика? Только не по объективу!':'Ну? Можешь атаковать, поговорить или достать что-нибудь вкусное.';
 $('continue').hidden=s!=='dialogue';$('mood').textContent=game.ending?'ПОСЛЕ ФОТОСЕССИИ':game.affinity>=4?'КАЖЕТСЯ, МЫ ДРУЗЬЯ':game.hp<=18?'ФОТОГРАФ ВОЛНУЕТСЯ':'ЕЩЁ ОДИН МАЛЕНЬКИЙ КАДР';
 $('hp').textContent=`${game.hp} / 60`;$('bossBar').style.width=game.boss/game.maxBoss*100+'%';$('phase').textContent=`ФАЗА ${game.phaseNow} / 3`;$('trust').textContent='ДОВЕРИЕ '+Array.from({length:5},(_,i)=>i<game.affinity?'●':'○').join(' ');
 $('hint').textContent=game.secretReady?'★ Общий снимок получился. Сафари ждёт твоего решения.':game.affinity>=4&&game.finalSurvived?'Пощада доступна. Можно закончить бой.':game.used.has('camera')?'Секрет камеры: поза, рамка, неподвижность на щелчке.':'У каждого фотографа есть история. Попробуй ACT.';
 $('chapter').textContent=`ОСЕНЬ • КАДР ${String(game.turn+1).padStart(2,'0')}`;
 $('arenaLabel').textContent=s==='dodge'?SafariAttacks[game.pattern][0]:s==='fight'?'ПОЙМАЙ МОМЕНТ':s==='title'||s==='ending'?'':'ТВОЙ ХОД';
 $('statusHint').textContent=s==='dodge'?Math.ceil(game.duration-game.attackTime)+' СЕК':s==='fight'?'ТОЧНОСТЬ = УРОН':'ВЫБОР ЗА ТОБОЙ';$('guard').textContent=game.guard?'ЩИТ ×'+game.guard:'';
 document.querySelectorAll('[data-action]').forEach(b=>{b.disabled=s!=='menu';b.classList.toggle('ready',b.dataset.action==='mercy'&&game.affinity>=4&&game.finalSurvived);});
 const dodge=s==='dodge';$('stick').style.opacity=dodge?1:.3;$('moveHelp').style.opacity=dodge?1:.3;$('dash').disabled=!dodge||game.dashCD>0;$('dash').innerHTML=game.dashCD>0?`${game.dashCD.toFixed(1)}<small>ПЕРЕЗАРЯДКА</small>`:'РЫВОК<small>ПРОБЕЛ</small>';$('stick').hidden=s==='title'||s==='ending';$('dash').hidden=s==='title'||s==='ending';$('moveHelp').hidden=s==='title'||s==='ending';$('dashHelp').hidden=s==='title'||s==='ending';
}
function stickMove(e){const r=$('stick').getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/scale,y=(e.clientY-r.top-r.height/2)/scale;const m=Math.hypot(x,y);if(m>46){x*=46/m;y*=46/m;}joy={x:x/46,y:y/46};$('knob').style.transform=`translate(${x}px,${y}px)`;}
$('stick').onpointerdown=e=>{if(game.state!=='dodge'||paused||pointer!==null)return;e.preventDefault();pointer=e.pointerId;$('stick').setPointerCapture(pointer);stickMove(e);};$('stick').onpointermove=e=>{if(e.pointerId===pointer)stickMove(e);};for(const n of ['pointerup','pointercancel','lostpointercapture'])$('stick').addEventListener(n,e=>{if(e.pointerId===pointer){pointer=null;joy={x:0,y:0};$('knob').style.transform='';}});
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter','escape','w','a','s','d'].includes(k))e.preventDefault();if(e.repeat)return;if(k==='escape'){setPause(!paused);return;}if(paused)return;keys.add(k);if(k===' ')game.dodge();if(k==='enter'){if(game.state==='title')begin();else if(game.state==='dialogue')game.advance();else if(game.state==='fight')game.strike();}if(game.state==='menu'&&'1234'.includes(k))game.choose(['fight','act','item','mercy'][Number(k)-1]);sync();});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>{resetInput();if(game.state!=='title'&&game.state!=='ending')setPause(true);});document.addEventListener('visibilitychange',()=>{if(document.hidden)setPause(true);});
function imageReady(im){return im&&im.complete&&im.naturalWidth>0;}
function sprite(name,frame,row,x,y,w,h,tileW,tileH){const im=sprites[name];if(imageReady(im))ctx.drawImage(im,frame*tileW,row*tileH,tileW,tileH,Math.round(x),Math.round(y),w,h);}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function text(t,x,y,size=12,color='#e4c68e',align='center'){ctx.fillStyle=color;ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.fillText(t,Math.round(x),Math.round(y));}
function heart(x,y,color='#cf664f'){ctx.fillStyle=color;const pixels=[[1,0],[2,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],[2,4],[3,4],[4,4],[3,5]];for(const [a,b]of pixels)ctx.fillRect(Math.round(x-7+a*2),Math.round(y-6+b*2),2,2);}
function draw(){ctx.clearRect(0,0,960,540);ctx.save();if(shake>0)ctx.translate(Math.round(Math.sin(clock*81)*shake),0);
 // Sparse falling leaves stay behind the action and never count as hazards.
 for(let i=0;i<18;i++){const x=(i*173+Math.sin(clock*.5+i)*23)%960,y=(i*53+clock*(9+i%4))%540;rect(x,y,5+i%3,3,['#98723e','#b48743','#784a30'][i%3]);}
 const title=game.state==='title';let row=0,frame=Math.floor(clock*5)%6;
 if(game.state==='dodge'){row=[4,2,2,1,2,3,2][game.pattern];frame=Math.floor(game.attackTime*(row===1?7:4))%6;}
 if(game.state==='dialogue'&&game.affinity>1){row=5;frame=Math.floor(clock*1.3)%4;}
 if(bossHit>0){row=5;frame=3;}
 if(game.ending==='fight'){row=6;frame=Math.min(5,Math.floor((clock-bossDownAt)*6));}if(game.ending==='peace'||game.ending==='secret'){row=5;frame=1;}
 if(title){sprite('safari-atlas.png',Math.floor(clock*4)%6,0,568,110,240,270,160,180);}else{rect(394,226,172,9,'#181e16aa');sprite('safari-atlas.png',frame,row,400,56,160,180,160,180);}
 if(game.state!=='title'&&game.state!=='ending'){
 rect(274,258,412,196,'#171b15');rect(277,261,406,190,'#bcaa72');rect(280,264,400,184,'#1c251d');
 ctx.save();ctx.beginPath();ctx.rect(280,264,400,184);ctx.clip();ctx.translate(280,264);
 for(let x=0;x<400;x+=20)rect(x,0,1,184,'#263023');for(let y=0;y<184;y+=20)rect(0,y,400,1,'#263023');
 if(game.state==='dodge'){
 for(const z of game.zones){const a=game.attackTime-z.born,active=a>=z.delay;if(z.safe){ctx.fillStyle=active?'#b8844590':'#b38a392b';ctx.fillRect(0,0,400,z.y);ctx.fillRect(0,z.y+z.h,400,184-z.y-z.h);ctx.fillRect(0,z.y,z.x,z.h);ctx.fillRect(z.x+z.w,z.y,400-z.x-z.w,z.h);ctx.setLineDash(active?[]:[5,5]);ctx.strokeStyle='#e3d5a0';ctx.lineWidth=3;ctx.strokeRect(z.x,z.y,z.w,z.h);ctx.setLineDash([]);text(active?'СНИМОК':'СЮДА',z.x+z.w/2,z.y+18,11);if(!active)text((z.delay-a).toFixed(1),z.x+z.w/2,z.y+z.h-10,10);}else{rect(z.x,z.y,z.w,z.h,active?'#d5ad6bb0':'#95653b50');ctx.save();ctx.beginPath();ctx.rect(z.x,z.y,z.w,z.h);ctx.clip();ctx.strokeStyle='#c69c59';ctx.lineWidth=2;for(let i=-184;i<420;i+=16){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+184,184);ctx.stroke();}ctx.restore();if(!active)text('!',Math.max(12,z.x+z.w/2),Math.max(20,z.y+z.h/2),22);}}
 if(game.pattern===2&&game.aim){ctx.strokeStyle=game.aim.locked?'#e4c591':'#a78c51';ctx.lineWidth=2;ctx.strokeRect(game.aim.x-16,game.aim.y-16,32,32);rect(game.aim.x-23,game.aim.y,46,1,'#c2a064');rect(game.aim.x,game.aim.y-23,1,46,'#c2a064');}
 for(const b of game.bullets){if(b.kind==='photo'){ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));ctx.rotate(Math.sin(b.age)*.13);rect(-11,-13,22,26,'#e5d7b1');rect(-8,-10,16,16,'#707650');rect(-5,-5,7,10,'#ac703f');rect(2,-7,4,6,'#d0a254');ctx.restore();}else if(b.kind==='orb'){sprite('orb-atlas.png',Math.floor(b.age*8)%8,0,b.x-15,b.y-15,30,30,128,128);}else{ctx.save();ctx.translate(Math.round(b.x),Math.round(b.y));ctx.rotate(b.age*2);rect(-8,-4,16,8,'#b77338');rect(-4,-7,9,14,'#c59243');rect(-6,0,15,2,'#684729');ctx.restore();}}
 if(game.pattern===5){sprite('camera-atlas.png',Math.floor(game.attackTime*5)%7,0,170+Math.sin(game.attackTime*2)*130,105,60,60,160,160);}
 if(game.inv<=0||Math.floor(game.inv*15)%2===0)heart(game.heart.x,game.heart.y,game.dash>0?'#f3dca6':'#d36a53');
 if(game.attackTime<.85)text('ПРИГОТОВЬСЯ',200,88,19);
 rect(0,181,400*(1-game.attackTime/game.duration),3,'#b5b17b');
 }
 if(game.state==='fight'){rect(25,54,350,28,'#49442d');rect(172,54,56,28,'#a38642');rect(194,54,12,28,'#e5d5a2');for(let i=0;i<7;i++)rect(25+i*58,54,1,28,'#6e6541');rect(25+game.meter*350-2,47,4,42,'#fff0c8');}
 ctx.restore();}
 if(flashTime>0)sprite('camera-atlas.png',7,0,452,110,56,56,160,160);
 if(bossHit>0)text('-'+Math.round(lastDamage),480,85-bossHit*20,22,'#f5d7a2');
 ctx.restore();}
let lastDamage=0,flashTime=0,bossDownAt=0,uiClock=0;
function events(){for(const e of game.events){if(e.type==='hurt'){shake=5;sound.tone(90,.18,'sawtooth',.12);}if(e.type==='hitBoss'){bossHit=.7;lastDamage=e.data;sound.tone(150,.15,'triangle',.2);}if(e.type==='heal')sound.tone(650,.25,'triangle',.12);if(e.type==='dash')sound.tone(250,.1,'triangle');if(e.type==='shutter'){sound.play('flash');flashTime=.18;}if(e.type==='swing')sound.play('swing');if(e.type==='lock')sound.tone(800,.05);if(e.type==='end'){bossDownAt=clock;sound.stop();sound.tone(e.data==='loss'?130:740,.5,'triangle',.16);}}game.events=[];}
function tick(now){const dt=Math.min(.04,(now-last)/1000||0);last=now;if(!paused){clock+=dt;flashTime=Math.max(0,flashTime-dt);const input={x:joy.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:joy.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))};game.update(dt,input);shake=Math.max(0,shake-dt*18);bossHit=Math.max(0,bossHit-dt);chatter-=dt;if(game.state==='dialogue'&&game.textAge<game.lines[game.line].length*.025&&chatter<=0){sound.tone(320+Math.floor(clock*100)%160,.025,'square',.025);chatter=.075;}events();uiClock-=dt;if(uiClock<=0){sync();uiClock=.05;}draw();}requestAnimationFrame(tick);}
// Rendering has no external network dependency. Audio starts only after a gesture.
sync();requestAnimationFrame(tick);
