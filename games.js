module.exports=(io,db,on,push)=>{
db.shops=db.shops||{};db.comms=db.comms||{};
const T={};let tid=0;const R=n=>Math.floor(Math.random()*n);
const SEATS={dom1:2,dom2:4,nard:2,sas:2};
const tl=()=>Object.values(T).filter(t=>!t.over).map(t=>({id:t.id,type:t.type,stake:t.stake,seats:t.seats.map(u=>db.users[u].name),n:SEATS[t.type],live:!!t.live}));
const bc=()=>io.emit('tl',tl());
const view=(t,me)=>{const i=t.seats.indexOf(me),v={id:t.id,type:t.type,stake:t.stake,names:t.seats.map(u=>db.users[u].name),seat:i,turn:t.turn,over:t.over,live:!!t.live};
if(t.live)v.g=t.type[0]=='d'?{chain:t.chain,ends:t.ends,yard:t.yard.length,hand:t.h[i],cnt:t.h.map(h=>h.length)}:t.type=='sas'?{b:t.b}:{pts:t.pts,bar:t.bar,off:t.off,dice:t.dice};return v};
const push2=t=>t.seats.forEach(u=>on[u]&&on[u].emit('tv',view(t,u)));
const done=t=>{push2(t);if(t.over&&!t.del){t.del=1;setTimeout(()=>{delete T[t.id];bc()},6e4)}};
function fin(t,w){const n=t.seats.length;if(n==4)w=[0,1,2,3].filter(i=>i%2==w[0]%2);const pot=t.stake*n;
w.forEach(i=>{const u=db.users[t.seats[i]];u.money+=Math.floor(pot/w.length);push(u)});t.over=w;return 1}
// ---------- DOMINO (qəliz 28 daş, hər kəs yalnız öz daşını görür) ----------
function domInit(t){const all=[];for(let a=0;a<7;a++)for(let b=a;b<7;b++)all.push([a,b]);all.sort(()=>Math.random()-.5);
const n=t.seats.length;t.h=t.seats.map((_,i)=>all.slice(i*7,i*7+7));t.yard=all.slice(n*7);t.chain=[];t.ends=null;t.pass=0;
const sc=x=>(x[0]==x[1]?100:0)+x[0]+x[1];let best=-1,bs=0,bi=0;
t.h.forEach((h,i)=>h.forEach((x,j)=>{if(sc(x)>best){best=sc(x);bs=i;bi=j}}));t.turn=bs;domPlay(t,bs,bi,'r')}
const domCan=(t,p)=>t.h[p].some(x=>x.includes(t.ends[0])||x.includes(t.ends[1]));
function domPlay(t,p,i,side){let x=t.h[p][i];if(!x)return 0;
if(!t.ends){t.chain=[x];t.ends=[x[0],x[1]]}
else if(side=='l'){if(!x.includes(t.ends[0]))return 0;if(x[0]==t.ends[0])x=[x[1],x[0]];t.chain.unshift(x);t.ends[0]=x[0]}
else{if(!x.includes(t.ends[1]))return 0;if(x[1]==t.ends[1])x=[x[1],x[0]];t.chain.push(x);t.ends[1]=x[1]}
t.h[p].splice(i,1);t.pass=0;if(!t.h[p].length)return fin(t,[p]);t.turn=(t.turn+1)%t.seats.length;return 1}
function blocked(t){const s=t.h.map(h=>h.reduce((a,x)=>a+x[0]+x[1],0)),sc=t.seats.length==4?[s[0]+s[2],s[1]+s[3]]:s;fin(t,[sc.indexOf(Math.min(...sc))])}
// ---------- ŞAŞKİ (rus şaşkisi: məcburi vurma, damka uzaq gedir) ----------
function sasInit(t){t.b=[...Array(8)].map(()=>Array(8).fill(0));for(let r=0;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2){if(r<3)t.b[r][c]='b';if(r>4)t.b[r][c]='w'}t.turn=0;t.cont=null}
const own=(x,p)=>x&&x.toLowerCase()==(p?'b':'w');
function sMoves(t,p){const B=t.b,caps=[],simp=[];
const cells=t.cont?[t.cont]:[].concat(...B.map((row,r)=>row.map((x,c)=>own(x,p)?[r,c]:null))).filter(Boolean);
for(const[r,c]of cells){const K=B[r][c]<'a';
for(const[dr,dc]of[[1,1],[1,-1],[-1,1],[-1,-1]]){let rr=r+dr,cc=c+dc,seen=null;
while(rr>=0&&rr<8&&cc>=0&&cc<8){const y=B[rr][cc];
if(!seen){if(!y){if(!t.cont&&(K||dr==(p?1:-1)))simp.push([r,c,rr,cc])}else if(own(y,p))break;else seen=[rr,cc]}
else{if(!y)caps.push([r,c,rr,cc,seen[0],seen[1]]);else break}
if(!K&&Math.abs(rr-r)>=(seen?2:1))break;rr+=dr;cc+=dc}}}
return caps.length?caps:simp}
function sMove(t,p,m){const[r,c,rr,cc]=m,L=sMoves(t,p).find(x=>x[0]==r&&x[1]==c&&x[2]==rr&&x[3]==cc);if(!L)return 0;
const B=t.b;let x=B[r][c];B[r][c]=0;if(L[4]!=null)B[L[4]][L[5]]=0;
if((!p&&rr==0)||(p&&rr==7))x=x.toUpperCase();B[rr][cc]=x;t.cont=null;
if(L[4]!=null){t.cont=[rr,cc];if(!sMoves(t,p).length)t.cont=null}
if(!t.cont){t.turn=1-p;if(!sMoves(t,1-p).length)return fin(t,[p])}return 1}
// ---------- NƏRD (qısa nərd: vurma, bar, çıxarma) ----------
const nA=(p,q)=>p?23-q:q,nM=(t,p,q)=>t.pts[nA(p,q)]*(p?-1:1);
function nInit(t){t.pts=Array(24).fill(0);for(const[q,n]of[[23,2],[12,5],[7,3],[5,5]]){t.pts[q]+=n;t.pts[23-q]-=n}t.bar=[0,0];t.off=[0,0];t.turn=0;nRoll(t)}
function nTry(t,p,f,d){if(f==24?!t.bar[p]:(t.bar[p]||nM(t,p,f)<1))return null;const q=f-d;
if(q<0){for(let i=6;i<24;i++)if(nM(t,p,i)>0)return null;if(q<-1)for(let i=f+1;i<6;i++)if(nM(t,p,i)>0)return null;return -1}
return nM(t,p,q)<-1?null:q}
const nAny=(t,p)=>t.dice.some(d=>{for(let f=0;f<=24;f++)if(nTry(t,p,f,d)!=null)return 1});
function nRoll(t,k=0){const a=R(6)+1,b=R(6)+1;t.dice=a==b?[a,a,a,a]:[a,b];if(k<4&&!nAny(t,t.turn)){t.turn=1-t.turn;nRoll(t,k+1)}}
function nMove(t,p,m){if(m.f==null)return 0;const fq=m.f=='bar'?24:nA(p,+m.f);if(!(fq>=0&&fq<=24))return 0;let d,q;
if(m.to=='off'){d=t.dice.find(x=>nTry(t,p,fq,x)==-1);q=-1}else{q=nA(p,+m.to);d=fq-q;if(!t.dice.includes(d)||nTry(t,p,fq,d)!==q)return 0}
if(!d)return 0;
if(fq==24)t.bar[p]--;else t.pts[nA(p,fq)]-=p?-1:1;
if(q<0)t.off[p]++;else{const ai=nA(p,q);if(t.pts[ai]*(p?-1:1)==-1){t.pts[ai]=0;t.bar[1-p]++}t.pts[ai]+=p?-1:1}
t.dice.splice(t.dice.indexOf(d),1);if(t.off[p]==15)return fin(t,[p]);
if(!t.dice.length||!nAny(t,p)){t.turn=1-p;nRoll(t)}return 1}
const INIT={dom1:domInit,dom2:domInit,nard:nInit,sas:sasInit};
// ---------- per-socket ----------
return(s,g)=>{
const join=(u,t,cb)=>{if(Object.values(T).some(x=>!x.over&&x.seats.includes(u.id)))return cb({msg:'Artıq masadasan'});
if(t.live||u.money<t.stake)return cb({msg:'Qoşulmaq olmur / pul çatmır'});t.seats.push(u.id);s.join('t_'+t.id);
if(t.seats.length==SEATS[t.type]){t.live=1;t.seats.forEach(id=>{db.users[id].money-=t.stake;push(db.users[id])});INIT[t.type](t)}done(t);bc()};
g('tl',u=>{s.emit('tl',tl());s.emit('shops',db.shops);s.emit('comms',db.comms);for(const[id,c]of Object.entries(db.comms))if(c.m.includes(u.id))s.join('c_'+id)});
g('tcreate',(u,d,cb)=>{if(!SEATS[d.type])return;const stake=Math.max(0,Math.floor(+d.stake)||0);const t=T[++tid]={id:tid,type:d.type,stake,seats:[]};join(u,t,cb);if(!t.seats.length)delete T[tid]});
g('tjoin',(u,d,cb)=>{const t=T[d.id];t&&join(u,t,cb)});
g('tleave',(u,d)=>{const t=T[d.id];if(t&&t.seats.includes(u.id)){const p=t.seats.indexOf(u.id);
if(t.live&&!t.over){fin(t,[(p+1)%t.seats.length]);done(t)}else if(!t.live){t.seats.splice(p,1);if(!t.seats.length)delete T[t.id];else push2(t)}}
s.leave('t_'+d.id);s.emit('tv',{gone:1});bc()});
g('tmove',(u,d)=>{const t=T[d.id];if(!t||!t.live||t.over)return;const p=t.seats.indexOf(u.id);if(p<0||t.turn!=p)return;const m=d.m||{};let ok=0;
if(t.type[0]=='d'){const can=domCan(t,p);
if(m.k=='play')ok=domPlay(t,p,m.i,m.side=='l'?'l':'r');
else if(m.k=='draw'&&!can&&t.yard.length){t.h[p].push(t.yard.pop());ok=1}
else if(m.k=='pass'&&!can&&!t.yard.length){t.pass++;t.pass>=t.seats.length?blocked(t):(t.turn=(p+1)%t.seats.length);ok=1}}
else if(t.type=='sas')ok=sMove(t,p,m.m||[]);else ok=nMove(t,p,m);
if(ok)done(t)});
// bazar
const sh=()=>io.emit('shops',db.shops);
g('shopadd',(u,d,cb)=>{const p=Math.floor(+d.p),n=String(d.n||'').slice(0,30);if(!n||!(p>=0))return;
const S=db.shops[u.id]=db.shops[u.id]||{name:u.name+' dükanı',items:[]};if(S.items.length>=20)return cb({msg:'Maks 20 məhsul'});S.items.push({n,p});sh();cb({msg:'Əlavə olundu'})});
g('shopdel',(u,d)=>{const S=db.shops[u.id];if(S){S.items.splice(d.i,1);sh()}});
g('shopbuy',(u,d,cb)=>{const o=db.users[d.owner],it=db.shops[d.owner]&&db.shops[d.owner].items[d.i];
if(!it||!o||o==u||u.money<it.p)return cb({msg:'Alınmadı'});u.money-=it.p;o.money+=it.p;push(u);push(o);u.inv[it.n]=(u.inv[it.n]||0)+1;cb({msg:it.n+' alındı'})});
// cəmiyyətlər
g('commk',(u,d,cb)=>{if(u.rank!='Kamandir')return cb({msg:'Yalnız Kamandir'});const id='c'+Date.now().toString(36);
db.comms[id]={name:String(d.name||'').slice(0,24),m:[u.id]};s.join('c_'+id);io.emit('comms',db.comms);cb({msg:'Yaradıldı'})});
g('commj',(u,d)=>{const c=db.comms[d.id];if(!c)return;if(!c.m.includes(u.id))c.m.push(u.id);s.join('c_'+d.id);io.emit('comms',db.comms)});
}};
