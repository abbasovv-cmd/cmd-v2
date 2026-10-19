let TL=[],SHP={},CM={},TV=null,sel=null,cr='lobby';
const tm=m=>act('tmove',{id:TV.id,m});
S.on('init',()=>{S.emit('tl');$('#nav').insertAdjacentHTML('beforeend','<button id=t_tb>🎲 Masalar</button><button id=t_bz>🏪 Bazar</button>');['tb','bz'].forEach(k=>$('#t_'+k).onclick=()=>{tab=k;draw()})});
S.on('tl',l=>{TL=l;if(tab=='tb'&&!TV)drawT()});
S.on('shops',s=>{SHP=s;if(tab=='bz')drawBz()});
S.on('comms',c=>{CM=c;if(tab=='chat')draw()});
S.on('tv',v=>{if(v.gone){TV=null;room='lobby';sel=null}else TV=v;if(tab=='tb')(TV&&$('#tb'))?drawBoard():drawT()});
const _d=draw;
draw=function(){if(tab=='tb'||tab=='bz'){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('a',b.id=='t_'+tab));return tab=='tb'?drawT():drawBz()}
_d();if(tab=='chat')commUI()};
// ---- cəmiyyətlər ----
function commUI(){const E=Object.entries(CM),my=E.filter(([,c])=>c.m.includes(me.id)),ot=E.filter(([,c])=>!c.m.includes(me.id));
$('#view').insertAdjacentHTML('afterbegin',`<div class=row><select id=rs><option value=lobby>🌍 Ümumi</option>${my.map(([i,c])=>`<option value=c_${i} ${cr=='c_'+i?'selected':''}>👥 ${esc(c.name)}</option>`).join('')}</select>${ot.length?`<select id=cj><option value="">Qoşul...</option>${ot.map(([i,c])=>`<option value=${i}>${esc(c.name)}</option>`).join('')}</select>`:''}${me.rank=='Kamandir'?'<button id=ck>＋ Cəmiyyət</button>':''}</div>`);
if(cr!='lobby'){room=cr;$('#msgs').innerHTML=''}
$('#rs').onchange=e=>{cr=room=e.target.value;$('#msgs').innerHTML='';if(room=='lobby')hist.forEach(addMsg)};
if($('#cj'))$('#cj').onchange=e=>e.target.value&&S.emit('commj',{id:e.target.value});
if($('#ck'))$('#ck').onclick=()=>{const n=prompt('Cəmiyyət adı');n&&act('commk',{name:n})}}
// ---- bazar ----
function drawBz(){const my=SHP[me.id];$('#view').innerHTML=`<div class=card><h3>Mənim dükanım</h3><div class=row><input id=sn placeholder="Məhsul"><input id=sp type=number placeholder="Qiymət"><button onclick="act('shopadd',{n:$('#sn').value,p:$('#sp').value})">Əlavə</button></div>${((my&&my.items)||[]).map((x,i)=>`<div>${esc(x.n)} — ${fmt(x.p)} <button onclick="S.emit('shopdel',{i:${i}})">✕</button></div>`).join('')}</div>`+
Object.entries(SHP).filter(([o])=>o!=me.id).map(([o,s])=>`<div class=card><b>${esc(s.name)}</b>${s.items.map((x,i)=>`<div>${esc(x.n)} — ${fmt(x.p)} <button onclick="act('shopbuy',{owner:'${o}',i:${i}})">Al</button></div>`).join('')}</div>`).join('')}
// ---- masalar ----
const NM={dom1:'Domino 1v1',dom2:'Domino 2v2',nard:'Nərd',sas:'Şaşki'};
function drawT(){const v=$('#view');
if(!TV){room='lobby';v.innerHTML=`<div class=card><div class=row><select id=ty>${Object.entries(NM).map(([k,l])=>`<option value=${k}>${l}</option>`).join('')}</select><input id=sk type=number placeholder="Mərc"><button onclick="act('tcreate',{type:$('#ty').value,stake:$('#sk').value})">Masa aç</button></div></div>`+
TL.map(t=>`<div class=card>${NM[t.type]} · mərc ${fmt(t.stake)} · ${t.seats.map(esc).join(', ')} (${t.seats.length}/${t.n}) ${t.live?'▶️':`<button onclick="act('tjoin',{id:${t.id}})">Otur</button>`}</div>`).join('');return}
room='t_'+TV.id;v.innerHTML='<div id=tb></div>'+chatHTML();wireChat();drawBoard()}
function drawBoard(){const t=TV,my=t.live&&!t.over&&t.seat==t.turn;
let h=`<div class=card>${t.names.map((n,i)=>(i==t.turn&&t.live&&!t.over?'👉':'')+esc(n)+(t.g&&t.g.cnt?' ('+t.g.cnt[i]+')':'')).join(' · ')} · mərc ${fmt(t.stake)} <button onclick="S.emit('tleave',{id:${t.id}})">Çıx</button></div>`;
if(t.over)h+=`<div class=card>🏆 Qalib: ${t.over.map(i=>esc(t.names[i])).join(', ')}</div>`;
if(!t.live)h+='<div class=card>Oyunçular gözlənilir...</div>';
else h+=t.type[0]=='d'?domUI(t,my):t.type=='sas'?sasUI(t,my):nardUI(t,my);
$('#tb').innerHTML=h}
const dt=x=>`<span class=cd>${x[0]}|${x[1]}</span>`;
function domUI(t,my){const g=t.g,can=g.hand.some(x=>x.includes(g.ends[0])||x.includes(g.ends[1]));
let h=`<div class=card>Zəncir: ${g.chain.map(dt).join('')}<br>Anbar: ${g.yard}</div><div class=card>Daşların:<br>`;
g.hand.forEach((x,i)=>h+=dt(x)+(my?`<button onclick="tm({k:'play',i:${i},side:'l'})">◀</button><button onclick="tm({k:'play',i:${i},side:'r'})">▶</button> `:''));
if(my&&!can)h+=g.yard?`<br><button onclick="tm({k:'draw'})">Daş çək</button>`:`<br><button onclick="tm({k:'pass'})">Keç</button>`;return h+'</div>'}
function sasUI(t,my){const f=t.seat==1,B=t.g.b;let h='<div style="display:grid;grid-template-columns:repeat(8,1fr);max-width:360px">';
for(let i=0;i<8;i++)for(let j=0;j<8;j++){const r=f?7-i:i,c=f?7-j:j,x=B[r][c],s=sel&&sel[0]==r&&sel[1]==c;
h+=`<div onclick="sc(${r},${c})" style="aspect-ratio:1;background:${s?'#c98a1c':(r+c)%2?'#6b4a1e':'#e8d3a8'};display:flex;align-items:center;justify-content:center;font-size:20px">${x?(x.toLowerCase()=='w'?'⚪':'⚫')+(x<'a'?'👑':''):''}</div>`}
return h+'</div>'}
function sc(r,c){if(sel&&!TV.g.b[r][c]){tm({m:[sel[0],sel[1],r,c]});sel=null}else sel=[r,c];drawBoard()}
function nardUI(t,my){const g=t.g,pt=i=>{const n=g.pts[i];return`<div onclick="nc(${i})" style="flex:1;text-align:center;padding:6px 0;font-size:12px;border:1px solid #6b4a1e;background:${sel===i?'#c98a1c':'#241a10'}">${i}<br>${n?(n>0?'⚪':'⚫')+Math.abs(n):'·'}</div>`};
let a='',b='';for(let i=12;i<24;i++)a+=pt(i);for(let i=11;i>=0;i--)b+=pt(i);
return`<div class=card>Zər: ${g.dice.map(d=>`<span class=cd>${d}</span>`).join('')||'—'}<br>Bar ⚪${g.bar[0]} ⚫${g.bar[1]} · Çıxan ⚪${g.off[0]} ⚫${g.off[1]}<br>Sən ${t.seat?'⚫ (0→23)':'⚪ (23→0)'}</div><div style="display:flex">${a}</div><div style="display:flex;margin-top:6px">${b}</div>`+(my?`<div class=row><button onclick="sel='bar';drawBoard()">Bar-dan</button><button onclick="tm({f:sel,to:'off'});sel=null">Çıxar</button></div>`:'')}
function nc(i){if(sel==null)sel=i;else{tm({f:sel,to:i});sel=null}drawBoard()}
