const express=require('express'),http=require('http'),fs=require('fs'),path=require('path');
const {Server}=require('socket.io');
const app=express(),srv=http.createServer(app),io=new Server(srv,{maxHttpBufferSize:1e7});
const DATA=process.env.DATA_DIR||__dirname,DB=path.join(DATA,'db.json'),UP=path.join(DATA,'uploads');
fs.mkdirSync(UP,{recursive:true});
let db={users:{},chat:[]};try{db=JSON.parse(fs.readFileSync(DB))}catch{}
setInterval(()=>fs.writeFileSync(DB,JSON.stringify(db)),5000);
const RANKS=['Kamandir','Diktator','Ajan','Azərbaycan naziri','Masallı səfiri','Musaküçə səfiri','Xaladelnik ustası','Xalça yuyan','Qeyfe','İsmail kartal','Nəriman axundzadə','Halit','Büyük baron eren eylül','Maygülü','Rutbesiz','Nərbala','Mator ustası','Sentr ustası','Çayxana müdiri','Nərd çempionu','Təkər təmircisi','Məhəllə komendantı','Öncələrin bəylərbəyi','Qonşu kəndin nümayəndəsi','Usta Məmməd','Dayıoğlu','Ehtiyatda olan paşa','Gizli general','Kulis arxası səfir','Ləqəbsiz qəhrəman','Bazar başçısı','Çay paylayan','Bazdiğ müdürü','Peraşki satan','Dükan yiyəsi','Nökər','Mekteb direktoru','Porno king','Eşşəy satan'];
const mk=(a,b)=>a.map((n,k)=>[n,Math.round(b*(1-k/(a.length+1))/1000)*1000]);
const SHOP={ // ən yaxşıdan ən pisə; yaxşılar yüksək rütbəyə
cig:mk(['Davidoff','Sobranie','Puro','Rothmans','Parliament','Marlboro','Winston','Kent','Camel','Pall Mall','L&M','Prima'],80000),
whisky:mk(['The Macallan','Chivas Regal','Johnnie Walker','Glenfiddich','Jack Daniel’s','Monkey Shoulder','Jameson','Ballantine’s','Dewar’s','Bushmills','Jim Beam','The Famous Grouse'],400000),
vodka:mk(['Beluga','Belvedere','Grey Goose','Stolichnaya','Tito’s','Finlandia','Absolut','Żubrówka','Russian Standard','Skyy','Nemiroff','Smirnoff'],250000),
qeh:[['Arvad',150000],['Zülüş',400000],['İlahə',900000]]};
const BIZ={cay:[50000,150000,'☕ Çay satdın'],masin:[70000,200000,'🔧 Maşın təmir etdin'],xala:[60000,180000,'🧺 Xaladelnik dükanı'],bazar:[40000,250000,'🛒 Bazarda satış'],dark:[300000,900000,'🕶️ Yeraltı iş']};
const on={},okUrl=u=>/^\/uploads\/[\w.]+$/.test(u||'');
const push=u=>{const s=on[u.id];s&&s.emit('me',{...u,ri:RANKS.indexOf(u.rank)})};
const list=()=>Object.values(db.users).map(u=>({id:u.id,name:u.name,photo:u.photo,rank:u.rank,on:!!on[u.id]}));
// ---- Blackjack (ortaq masa, 4 nəfərə qədər) ----
const bj={p:{},d:[],ph:'bet',turn:null};
const card=()=>({r:1+Math.floor(Math.random()*13),s:Math.floor(Math.random()*4)});
const val=h=>{let t=0,a=0;for(const c of h){t+=c.r>10?10:c.r==1?11:c.r;if(c.r==1)a++}while(t>21&&a--)t-=10;return t};
const pub=()=>({ph:bj.ph,turn:bj.turn,d:bj.ph=='play'?[bj.d[0],{h:1}]:bj.d,p:Object.entries(bj.p).map(([id,x])=>({id,name:db.users[id].name,bet:x.bet,h:x.h,st:x.st,v:val(x.h)}))});
const send=()=>io.to('bj').emit('bj',pub());
function nxt(){const e=Object.entries(bj.p).find(([,x])=>!x.st);if(e){bj.turn=e[0];return send()}
bj.turn=null;while(val(bj.d)<17)bj.d.push(card());const dv=val(bj.d);
for(const[id,x]of Object.entries(bj.p)){const v=val(x.h);let w=0;
if(x.st=='bj'&&!(dv==21&&bj.d.length==2))w=x.bet*2.5;else if(v<=21&&(dv>21||v>dv))w=x.bet*2;else if(v<=21&&v==dv)w=x.bet;
if(w){const u=db.users[id];u.money+=w;push(u)}}
bj.ph='done';send();setTimeout(()=>{bj.p={};bj.d=[];bj.ph='bet';send()},8000)}
const games=require('./games')(io,db,on,push);
// ---- HTTP ----
app.get('/',(q,r)=>r.sendFile(path.join(__dirname,'index.html')));app.get('/client.js',(q,r)=>r.sendFile(path.join(__dirname,'client.js')));app.use('/uploads',express.static(UP));
app.post('/up',express.raw({type:()=>true,limit:'80mb'}),(req,res)=>{
let ext=String(req.query.ext||'').toLowerCase();if(!['jpg','jpeg','png','gif','webp','mp4','mov','webm','m4a','mp3','ogg'].includes(ext))ext='bin';
const f=Date.now()+Math.random().toString(36).slice(2,8)+'.'+ext;fs.writeFileSync(path.join(UP,f),req.body);res.json({url:'/uploads/'+f})});
// ---- Socket ----
io.on('connection',s=>{
const U=()=>db.users[s.uid];
const g=(ev,fn)=>s.on(ev,(d,cb)=>{if(!U())return;fn(U(),d||{},typeof cb=='function'?cb:()=>{})});
const add=(u,n)=>{u.money+=n;push(u)};
const enter=u=>{s.uid=u.id;on[u.id]=s;s.join('lobby');push(u);s.emit('init',{ranks:RANKS,shop:SHOP,chat:db.chat.slice(-80)});io.emit('users',list())};
s.on('reg',(d,cb)=>{const name=String(d.name||'').trim().slice(0,20);if(!name)return cb({ok:0,msg:'Ad yaz'});
let id;do id=String(10000000+Math.floor(Math.random()*9e7));while(db.users[id]);
const u=db.users[id]={id,name,photo:okUrl(d.photo)?d.photo:'',rank:Object.keys(db.users).length<2?'Kamandir':'Rutbesiz',money:250000,debt:0,inv:{},cd:{}};
enter(u);cb({ok:1,id})});
s.on('login',(d,cb)=>{const u=db.users[String(d.id).trim()];if(!u)return cb({ok:0,msg:'ID tapılmadı'});enter(u);cb({ok:1,id:u.id})});
g('msg',(u,d)=>{if(!s.rooms.has(d.room))return;
const m={id:u.id,name:u.name,photo:u.photo,rank:u.rank,room:d.room,text:String(d.text||'').slice(0,1000),media:d.media&&okUrl(d.media.url)?{type:d.media.type,url:d.media.url}:null,t:Date.now()};
if(!m.text&&!m.media)return;if(d.room=='lobby'){db.chat.push(m);db.chat=db.chat.slice(-300)}io.to(d.room).emit('msg',m)});
g('pay',(u,d,cb)=>{const t=db.users[d.to],a=Math.floor(+d.amt);if(!t||t==u||!(a>0)||a>u.money)return cb({msg:'Səhv məbləğ/istifadəçi'});u.money-=a;add(t,a);push(u);cb({msg:`${t.name} adlı şəxsə ${a} göndərildi`})});
g('loan',(u,d,cb)=>{const a=Math.floor(+d.amt);if(!(a>0)||u.debt+a>5e6)return cb({msg:'Kredit limiti 5 000 000'});u.debt+=a;add(u,a);cb({msg:'Kredit alındı'})});
g('repay',(u,d,cb)=>{const a=Math.min(Math.floor(+d.amt),u.debt,u.money);if(!(a>0))return cb({msg:'Ödəniş mümkün deyil'});u.debt-=a;add(u,-a);cb({msg:'Ödənildi'})});
g('salary',(u,d,cb)=>{const n=Date.now();if(n-(u.cd.sal||0)<6e4)return cb({msg:'60 saniyə gözlə'});u.cd.sal=n;const a=(RANKS.length-RANKS.indexOf(u.rank))*20000;add(u,a);cb({msg:`Rütbə maaşı: +${a}`})});
g('work',(u,d,cb)=>{const b=BIZ[d.biz];if(!b)return;const n=Date.now();if(n-(u.cd[d.biz]||0)<15e3)return cb({msg:'15 saniyə gözlə'});u.cd[d.biz]=n;
if(d.biz=='dark'&&Math.random()<.25){const f=Math.min(u.money,200000);add(u,-f);return cb({msg:`🚔 Tutuldun! -${f}`})}
const a=b[0]+Math.floor(Math.random()*(b[1]-b[0]));add(u,a);cb({msg:`${b[2]}: +${a}`})});
g('buy',(u,d,cb)=>{const it=(SHOP[d.cat]||[])[d.i];if(!it)return;if(d.cat!='qeh'&&RANKS.indexOf(u.rank)>3+d.i*3)return cb({msg:'Rütbən çatmır'});if(u.money<it[1])return cb({msg:'Pul çatmır'});
add(u,-it[1]);u.inv[it[0]]=(u.inv[it[0]]||0)+1;cb({msg:d.cat=='qeh'?`🌙 ${it[0]}… pərdə bağlandı.`:`${it[0]} aldın`})});
g('setrank',(u,d)=>{const t=db.users[d.id];if(u.rank!='Kamandir'||!t||!RANKS.includes(d.rank))return;t.rank=d.rank;push(t);io.emit('users',list())});
g('sig',(u,d)=>on[d.to]&&on[d.to].emit('sig',{from:u.id,name:u.name,d:d.d}));
games(s,g);
g('bjjoin',()=>{s.join('bj');s.emit('bj',pub())});
g('bjbet',(u,d,cb)=>{if(bj.ph!='bet')return cb({msg:'Raund gedir, gözlə'});const a=Math.floor(+d.amt);if(!(a>0)||a>u.money||bj.p[u.id]||Object.keys(bj.p).length>=4)return cb({msg:'Mərc alınmadı'});add(u,-a);bj.p[u.id]={bet:a,h:[],st:''};send()});
g('bjdeal',()=>{if(bj.ph!='bet'||!Object.keys(bj.p).length)return;bj.d=[card(),card()];for(const x of Object.values(bj.p)){x.h=[card(),card()];if(val(x.h)==21)x.st='bj'}bj.ph='play';nxt()});
g('bjhit',u=>{const x=bj.p[u.id];if(bj.ph!='play'||bj.turn!=u.id)return;x.h.push(card());const v=val(x.h);if(v>21)x.st='bust';else if(v==21)x.st='stand';x.st?nxt():send()});
g('bjstand',u=>{if(bj.ph!='play'||bj.turn!=u.id)return;bj.p[u.id].st='stand';nxt()});
s.on('disconnect',()=>{const id=s.uid;if(!id)return;delete on[id];if(bj.ph=='play'&&bj.turn==id){bj.p[id].st='stand';nxt()}io.emit('users',list())});
});
srv.listen(process.env.PORT||3000,()=>console.log('Mafya server işləyir'));
