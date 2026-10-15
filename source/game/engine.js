/* Safari Boss Fight — deterministic, renderer-independent combat rules. */
(function(root){
'use strict';
const W=400,H=184;
const ATTACKS=[
 ['ПАДАЮЩИЕ СНИМКИ','Снимки падают сверху. Ищи просветы между ними.'],
 ['ВСПЫШКА','Полосатая область скоро вспыхнет. Выйди за её край.'],
 ['ФОТООХОТА','Прицел следит, затем замирает. Уходи после щелчка!'],
 ['ОСЕННИЙ ВИХРЬ','Рыжие листья опасны. Бледные маленькие листья — декорация.'],
 ['ИДЕАЛЬНЫЙ КАДР','Встань внутрь пунктирной рамки до снимка.'],
 ['КАМЕРА НА РЕМЕШКЕ','Камера качается по нижней части арены. Смотри на её путь.'],
 ['ПОСЛЕДНИЙ СНИМОК','Войди в рамку. На слове «СНИМОК» замри — Сафари ищет живой кадр.']
];
class Battle{
 constructor(seed=17){this.seed=seed;this.reset();}
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 reset(){Object.assign(this,{state:'title',hp:60,maxHp:60,boss:180,maxBoss:180,turn:0,phase:1,affinity:0,used:new Set(),items:[2,1,1],hits:0,elapsed:0,bullets:[],zones:[],events:[],heart:{x:200,y:130},inv:0,dash:0,dashCD:0,guard:0,finalSurvived:false,photoHeld:0,secretReady:false,ending:null,attackTime:0,spawn:0,cycle:-1,aim:null,freezeGood:true});}
 event(type,data){this.events.push({type,data});}
 say(lines,next='menu'){this.lines=Array.isArray(lines)?lines:[lines];this.line=0;this.textAge=0;this.state='dialogue';this.next=next;}
 advance(){if(this.state!=='dialogue')return;const l=this.lines[this.line];if(this.textAge<l.length*.025){this.textAge=100;return;}if(++this.line<this.lines.length){this.textAge=0;this.event('talk');}else if(this.next==='attack')this.beginAttack();else if(this.next==='ending')this.state='ending';else this.state=this.next;}
 start(){this.reset();this.say(['ЭЙ! Подожди! У тебя невероятно фотогеничная… душа!','Я Сафари. Фотограф, следопыт и совершенно случайно — местная катастрофа.','Нужен один кадр для конкурса «Жизнь в движении». Ты двигаешься, я снимаю. Что может пойти не так?','Стрелки / WASD или левый стик — движение. Пробел / кнопка справа — рывок. Полосатые зоны предупреждают об атаке.','Не хочешь драться? Поговори со мной. Но сначала — улыбочку!']);}
 get phaseNow(){return Math.min(3,1+Number(this.turn>=3||this.boss<120||this.affinity>=2)+Number(this.turn>=7||this.boss<60||this.affinity>=4));}
 choose(action){if(this.state!=='menu')return;if(action==='fight'){this.state='fight';this.meter=0;this.meterAge=0;}else if(action==='act'||action==='item')this.state=action;else if(action==='mercy'){if(this.affinity>=4&&this.finalSurvived)this.finish(this.secretReady?'secret':'peace');else this.endTurn(this.affinity>=4?'Я почти согласна… Но сперва последний снимок. Обещаю — без обложки журнала!':'Пощадить? Да я ещё даже крышку с объектива… Ой. Ладно. Узнай меня получше!');}}
 strike(){if(this.state!=='fight')return;const precision=1-Math.min(1,Math.abs(this.meter-.5)*2);const damage=8+Math.round(precision*20);this.boss=Math.max(0,this.boss-damage);this.event('hitBoss',damage);if(!this.boss){this.finish('fight');return;}this.endTurn(precision>.85?'Ого! Даже выдержка не успела. У тебя что, встроенный стабилизатор?!':this.boss<55?'Ладно… Лапы уже дрожат. Но снимок сам себя не снимет!':'Эй! Это фотосессия, а не проверка прочности фотографа!');}
 actOptions(){const a=[['talk','Поговорить'],['joke','Пошутить'],['pose','Позировать'],['praise','Похвалить снимок'],['camera','Спросить о камере'],['silly','Смешная рожица']];if(this.used.has('camera')&&this.used.has('pose')&&this.finalSurvived)a.push(['selfie','Общее фото ★']);return a;}
 act(id){if(this.state!=='act')return;if(!this.actOptions().some(a=>a[0]===id))return;if(id==='selfie'){if(this.secretReady)this.finish('secret');else this.endTurn('Почти! Для общего фото надо услышать затвор и замереть ВНУТРИ рамки. Попробуем ещё раз?');return;}if(this.used.has(id)){this.endTurn('Это я уже записала! Давай что-нибудь новое. У меня не бесконечная плёнка.');return;}this.used.add(id);this.affinity=Math.min(5,this.affinity+1);const lines={talk:'На конкурс нужны живые эмоции. Я боялась, что без трюков никто не заметит мои снимки… Ой. Это было вслух?',joke:'«Почему фотоаппарат не спорит? У него есть выдержка». ХА! У моего, видимо, закончилась!',pose:'Вот! Подбородок выше. Хвост… А, у тебя нет. Ничего, мой за двоих поработает!',praise:'Правда нравятся?.. Я думала, все видят только смазанные листья. Спасибо. Следующий кадр будет мягче.',camera:'Это дедушкина камера. Он говорил: лучший кадр — когда фотограф тоже в нём. В последней рамке замри на щелчке. Запомни!',silly:'ПФФ! Всё, фокус потерян. Ты победил мои щёки. Они теперь болят от смеха.'};if(id==='praise')this.guard=2;this.endTurn(lines[id]);}
 item(i){if(this.state!=='item'||!this.items[i])return;this.items[i]--;const healing=[20,30,15][i];this.hp=Math.min(60,this.hp+healing);if(i===2)this.guard=3;this.event('heal');this.endTurn(['Шоколадка! И ни кусочка фотографу? Ладно, у меня в кармане три.','Имбирный чай? Теперь вся поляна пахнет перерывом. Я подожду.','Пирожное даёт +15 HP и защиту от трёх попаданий. Крошки я потом отретуширую.'][i]);}
 endTurn(line){this.say(line,'attack');}
 beginAttack(){this.phase=this.phaseNow;this.pattern=(this.affinity>=4&&!this.finalSurvived)||(this.boss<=45&&!this.finalSurvived)||(this.used.has('camera')&&this.used.has('pose')&&this.finalSurvived&&!this.secretReady)?6:this.turn%7;this.state='dodge';this.attackTime=0;this.spawn=0;this.cycle=-1;this.bullets=[];this.zones=[];this.heart={x:200,y:135};this.inv=.8;this.aim=null;this.freezeGood=true;this.photoHeld=0;this.duration=this.pattern===6?10:8+this.phase;this.event('attack',this.pattern);}
 dodge(){if(this.state==='dodge'&&this.dashCD<=0){this.dash=.19;this.inv=Math.max(this.inv,.28);this.dashCD=2.8;this.event('dash');}}
 hurt(){if(this.inv>0)return;const d=this.guard>0?3:6;if(this.guard>0)this.guard--;this.hp=Math.max(0,this.hp-d);this.hits++;this.inv=1.05;this.event('hurt');if(!this.hp)this.finish('loss');}
 finish(kind){this.ending=kind;this.bullets=[];this.zones=[];this.event('end',kind);const text={fight:['Всё-всё! Сдаюсь. Камеру не трогай — она ещё в рассрочку!','Знаешь… Ты мог пройти мимо. А остался. Вот этот кадр я сохраню. В следующий раз — просто чай.'],peace:['Стоп. Кажется, мне больше не нужен идеальный кадр.','Ты разговаривал со мной даже под летающими фотографиями. Друзья так делают, да?','Пойдём пить чай. И обещаю: никаких вспышек за столом!'],secret:['Щёлк.','Подожди… На снимке мы ОБА. И я впервые не прячусь за камерой.','Дедушка был прав. Лучший кадр — когда есть с кем его разделить. Назову его «Неожиданный друг».'],loss:['ЭЙ! Фотосессия отменяется! Садись. Дыши. Вот чай.','Я перестаралась… Давай переснимем? Теперь ты знаешь мои трюки.']};this.say(text[kind],'ending');}
 update(dt,input={x:0,y:0}){dt=Math.max(0,Math.min(dt,.04));if(!['title','ending'].includes(this.state)&&!this.ending)this.elapsed+=dt;if(this.state==='dialogue'){this.textAge+=dt;return;}if(this.state==='fight'){this.meterAge+=dt;this.meter=(Math.sin(this.meterAge*3.8-Math.PI/2)+1)/2;return;}if(this.state!=='dodge')return;
 this.attackTime+=dt;this.inv=Math.max(0,this.inv-dt);this.dash=Math.max(0,this.dash-dt);this.dashCD=Math.max(0,this.dashCD-dt);
 let ix=input.x||0,iy=input.y||0,mag=Math.hypot(ix,iy);if(mag>1){ix/=mag;iy/=mag;}const speed=this.dash>0?330:145;this.heart.x=Math.max(7,Math.min(W-7,this.heart.x+ix*speed*dt));this.heart.y=Math.max(7,Math.min(H-7,this.heart.y+iy*speed*dt));
 if(this.attackTime>.85)this.patternStep(dt,Math.hypot(ix,iy));
 for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.age+=dt;if(b.kind==='leaf')b.x+=Math.sin(b.age*5+b.seed)*20*dt;if(Math.hypot(b.x-this.heart.x,b.y-this.heart.y)<b.r+3)this.hurt();if(this.state!=='dodge')return;}
 this.bullets=this.bullets.filter(b=>b.x>-60&&b.x<W+60&&b.y>-70&&b.y<H+70);
 for(const z of this.zones){const a=this.attackTime-z.born;if(a>=z.delay&&a<z.delay+z.life){if(!z.fired){z.fired=true;this.event('shutter');}let inside=this.heart.x>z.x-3&&this.heart.x<z.x+z.w+3&&this.heart.y>z.y-3&&this.heart.y<z.y+z.h+3; if(z.safe)inside=!(this.heart.x>z.x+4&&this.heart.x<z.x+z.w-4&&this.heart.y>z.y+4&&this.heart.y<z.y+z.h-4);if(inside)this.hurt();if(this.state!=='dodge')return;}}
 this.zones=this.zones.filter(z=>this.attackTime-z.born<z.delay+z.life);
 if(this.attackTime>=this.duration){if(this.pattern===6)this.finalSurvived=true;this.turn++;this.bullets=[];this.zones=[];let line=this.hp<=18?'Ты побледнел. В сумке есть еда — я честно подожду.':this.secretReady?'Ты замер точно на щелчке! И я попала в кадр… Это же наш снимок!':this.affinity>=4&&this.finalSurvived?'Ладно. Камеру опускаю. Если хочешь, можем закончить мирно.': ['Ты увернулся от лучшего кадра! Хотя… этот тоже неплох.','Плёнка цела. Самооценка фотографа — под вопросом.','Листья, перестаньте лезть в объектив! Я тут работаю!'][this.turn%3];this.say(line);}
 }
 bullet(x,y,vx,vy,kind='photo',r=8){this.bullets.push({x,y,vx,vy,kind,r,age:0,seed:this.rand()*10});}
 zone(x,y,w,h,delay=1,life=.25,safe=false){this.zones.push({x,y,w,h,delay,life,safe,born:this.attackTime});}
 patternStep(dt,moving){const t=this.attackTime-.85,p=this.phase;
 if(this.pattern===0){this.spawn-=dt;if(this.spawn<=0){this.spawn=.8-.09*p;const gap=Math.floor(this.rand()*5);for(let i=0;i<5;i++)if(i!==gap&&i!==(gap+1)%5)this.bullet(40+i*80,-20,Math.sin(t)*12,48+p*13,'photo',10);}}
 if(this.pattern===1){let c=Math.floor(t/1.8);if(c!==this.cycle){this.cycle=c;let x=[0,250,120,0,250][c%5];this.zone(x,0,130,H,1.1,.22);}}
 if(this.pattern===2){const c=Math.floor(t/2),a=t%2;if(c!==this.cycle){this.cycle=c;this.aim=null;}if(a<.65)this.aim={x:this.heart.x,y:this.heart.y,locked:false};else if(this.aim&&!this.aim.locked){this.aim.locked=true;this.zone(this.aim.x-34,this.aim.y-34,68,68,.65,.3);this.event('lock');}}
 if(this.pattern===3){this.spawn-=dt;if(this.spawn<=0){this.spawn=.65-.06*p;const side=Math.floor(t/2)%2;this.bullet(side?-18:418,20+this.rand()*140,side?65+p*10:-65-p*10,Math.sin(t)*12,'leaf',7);if(p===3)this.bullet(40+this.rand()*320,-15,0,55,'orb',7);}}
 if(this.pattern===4){let c=Math.floor(t/2.4);if(c!==this.cycle){this.cycle=c;this.zone([30,145,245,145][c%4],32,120,120,1.65,.38,true);}}
 if(this.pattern===5){this.spawn-=dt;if(this.spawn<=0){this.spawn=.95;this.bullet(30+this.rand()*340,-12,0,53+p*9,'orb',7);}const c=Math.floor(t/2.8);if(c!==this.cycle){this.cycle=c;this.zone(0,120,W,64,1.25,.4);this.event('swing');}}
 if(this.pattern===6){let c=Math.floor(t/3),a=t%3;if(c!==this.cycle){this.cycle=c;this.freezeGood=true;this.photoHeld=0;this.zone([140,240,40][c%3],38,120,112,1.75,.6,true);}const z=this.zones[0];if(z&&a>1.75&&a<2.35){let inside=this.heart.x>z.x+7&&this.heart.x<z.x+z.w-7&&this.heart.y>z.y+7&&this.heart.y<z.y+z.h-7;if(moving>.12||!inside)this.freezeGood=false;else this.photoHeld+=dt;if(this.photoHeld>.48&&this.freezeGood&&this.used.has('camera')&&this.used.has('pose'))this.secretReady=true;}}
 }
}
root.SafariBattle=Battle;root.SafariAttacks=ATTACKS;if(typeof module!=='undefined')module.exports={Battle,ATTACKS};
})(typeof window==='undefined'?globalThis:window);
