import { catalog, isBoard } from './catalog.mjs';
import { compile, runtime } from './code.mjs';
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function visionPixels(visibility){
 const pixels=[];let red=0;for(let y=0;y<12;y++)for(let x=0;x<16;x++){const target=Math.hypot((x-7.5)/1.25,y-5.5)<4*visibility/100;pixels.push(target?'#f16a56':((x+y)%2?'#d3e4e6':'#c5dadd'));if(target)red++;}return{pixels,score:red/192*100};
}
export function solve(project,control={},motions={},time=0,dt=0){
 const issues=[],parts=project.parts;const issue=(id,severity,title,detail)=>{if(!issues.some(x=>x.id===id&&x.title===title))issues.push({id,severity,title,detail});};
 const parent=new Map(),key=(id,p)=>id+':'+p;
 for(const c of parts)for(const p of catalog[c.type].pins)parent.set(key(c.id,p.id),key(c.id,p.id));
 const find=x=>{if(!parent.has(x))return x;let r=x;while(parent.get(r)!==r)r=parent.get(r);while(parent.get(x)!==x){const old=parent.get(x);parent.set(x,r);x=old;}return r;};
 const join=(a,b)=>parent.set(find(a),find(b));
 for(const w of project.wires)join(key(w.from.part,w.from.pin),key(w.to.part,w.to.pin));
 for(const c of parts)if(c.type==='driver'||c.type==='bec')join(key(c.id,'-'),key(c.id,'OUT-'));
 for(const c of parts)if(c.type==='pdb')for(let i=1;i<=4;i++){join(key(c.id,'+'),key(c.id,'P'+i));join(key(c.id,'-'),key(c.id,'N'+i));}
 const net=(id,p)=>find(key(id,p));const battery=parts.find(c=>c.type==='battery');const ground=battery?net(battery.id,'-'):[...parent.values()][0];const nets=[...new Set([...parent.keys()].map(find))].filter(n=>n!==ground);const idx=new Map(nets.map((n,i)=>[n,i]));
 const resistors=[],diodes=[],sources=[],sinks=[];
 const resistor=(c,a,b,r)=>resistors.push({a:net(c.id,a),b:net(c.id,b),r:Math.max(.001,r)});
 for(const c of parts){const p=c.params;
 if(c.type==='battery'){if(net(c.id,'+')===net(c.id,'-'))issue(c.id,'error','Güç kaynağı kısa devre','+ ve − uçları aynı kablo ağına bağlı. Bu bağlantıyı kaldır; ideal kaynak kısa devresinde akım hesaplanamaz.');else sources.push({id:c.id,a:net(c.id,'+'),b:net(c.id,'-'),v:motions[c.id]?.empty?0:p.voltage});}
 else if(c.type==='resistor')resistor(c,'a','b',p.resistance);
 else if(c.type==='switch')resistor(c,'a','b',p.closed>=.5?.02:1e12);
 else if(c.type==='capacitor'){
  const previous=motions[c.id]?.capacitorVoltage;
  if(dt===0&&Number.isFinite(previous)){sources.push({id:c.id,a:net(c.id,'+'),b:net(c.id,'-'),v:previous});}
  else if(dt>0){const g=p.capacitance*1e-6/Math.max(dt,1e-6);resistor(c,'+','-',1/g);sinks.push({a:net(c.id,'+'),b:net(c.id,'-'),current:-g*(previous||0)});}
  else resistor(c,'+','-',1e12);
 }
 else if(c.type==='potentiometer'){resistor(c,'+','OUT',Math.max(1,p.resistance*(1-p.value/100)));resistor(c,'OUT','-',Math.max(1,p.resistance*p.value/100));}
 else if(c.type==='led')diodes.push({id:c.id,a:net(c.id,'+'),b:net(c.id,'-'),vf:p.vf,active:false});
 else if(c.type==='dcMotor')resistor(c,'+','-',p.resistance);
 else if(c.type==='buzzer')resistor(c,'+','-',250);
 else if(c.type==='pdb'){}
 else if(isBoard(c.type)){if(c.type==='flight')for(let i=0;i<5;i++)resistor(c,'A'+i,'GND',100000);resistor(c,'5V','GND',250);for(const [pin,mode] of Object.entries(control.modes||{}))if(mode===2&&catalog[c.type].pins.some(p=>p.id===pin))resistor(c,pin,'5V',20000);}
 else if(c.type==='servo')resistor(c,'+','-',62.5);
 else if(catalog[c.type].pins.some(p=>p.id==='-'))resistor(c,'+','-',1000);
 }
 if(!battery&&parts.length)issue(parts[0].id,'warning','Besleme ekle','Kütüphaneden DC güç kaynağı ekleyip + ve GND bağlantılarını yap.');
 function linearSolve(){
 const unique=[];for(const s of sources){if(s.a===s.b){if(Math.abs(s.v)>.001)issue(s.id.split(':')[0],'error','Çıkış kısa devresi','Gerilim çıkışı referans hattına kısa devre olmuş. Kabloları kontrol et.');continue;}const existing=unique.find(x=>x.a===s.a&&x.b===s.b||x.a===s.b&&x.b===s.a);if(existing){if(Math.abs(existing.v-(existing.a===s.a?s.v:-s.v))>.01)issue(s.id.split(':')[0],'error','Çakışan gerilim kaynakları','Farklı gerilim üreten iki çıkış aynı hatta bağlı. Çıkışları ayır.');continue;}unique.push(s);}
 const n=nets.length,m=n+unique.length;if(!m)return{values:new Map(),currents:{}};const mat=Array.from({length:m},()=>new Float64Array(m+1));const at=node=>idx.get(node);
 for(let i=0;i<n;i++)mat[i][i]=1e-9;
 function conduct(a,b,g){const i=at(a),j=at(b);if(i!==undefined)mat[i][i]+=g;if(j!==undefined)mat[j][j]+=g;if(i!==undefined&&j!==undefined){mat[i][j]-=g;mat[j][i]-=g;}}
 function inject(a,b,current){const i=at(a),j=at(b);if(i!==undefined)mat[i][m]-=current;if(j!==undefined)mat[j][m]+=current;}
 for(const r of resistors)conduct(r.a,r.b,1/r.r);
 for(const d of diodes){const g=d.active?.1:1e-10;conduct(d.a,d.b,g);if(d.active)inject(d.a,d.b,-g*d.vf);}
 for(const s of sinks)inject(s.a,s.b,s.current);
 unique.forEach((s,k)=>{const i=at(s.a),j=at(s.b),row=n+k;if(i!==undefined){mat[i][row]+=1;mat[row][i]+=1;}if(j!==undefined){mat[j][row]-=1;mat[row][j]-=1;}mat[row][m]=s.v;});
 for(let col=0;col<m;col++){let best=col;for(let r=col+1;r<m;r++)if(Math.abs(mat[r][col])>Math.abs(mat[best][col]))best=r;if(Math.abs(mat[best][col])<1e-14){issue(battery?.id||parts[0]?.id,'error','Devre çözülemiyor','Birbirine bağlı ideal kaynakları veya çıkışları ayır. Bağımsız her devrenin bir besleme dönüş yolu olmalı.');return{values:new Map(),currents:{}};}[mat[col],mat[best]]=[mat[best],mat[col]];const divisor=mat[col][col];for(let k=col;k<=m;k++)mat[col][k]/=divisor;for(let row=0;row<m;row++){if(row===col)continue;const f=mat[row][col];if(!f)continue;for(let k=col;k<=m;k++)mat[row][k]-=f*mat[col][k];}}
 return{values:new Map(nets.map((node,i)=>[node,mat[i][m]])),currents:Object.fromEntries(unique.map((s,i)=>[s.id,-mat[n+i][m]]))};
 }
 let result;function iterate(){for(let it=0;it<12;it++){result=linearSolve();let change=false;for(const d of diodes){const v=(result.values.get(d.a)||0)-(result.values.get(d.b)||0);const active=v>d.vf+1e-7;if(active!==d.active){d.active=active;change=true;}}if(!change)break;}return result;}
 iterate();const voltage=(id,a='+',b='-')=>(result.values.get(net(id,a))||0)-(result.values.get(net(id,b))||0);
 const becActive=new Set();
 for(const c of parts)if(c.type==='bec'){const v=voltage(c.id);if(v>=c.params.output+1&&v<=24){sources.push({id:c.id+':BEC',a:net(c.id,'OUT+'),b:net(c.id,'OUT-'),v:c.params.output});becActive.add(c.id);}else issue(c.id,'warning','BEC giriş gerilimi uygun değil','VIN en az çıkış gerilimi + 1V ve en çok 24V olmalı. Çıkış devre dışı.');}
 iterate();
 const board=parts.find(c=>isBoard(c.type));const profile=board?catalog[board.type]:catalog.board;const logic=profile.logic||5;const boardVoltage=board?voltage(board.id,'5V','GND'):0;const supply=profile.supply||logic;const boardOn=boardVoltage>=supply*.9&&boardVoltage<=supply*1.1;
 const pinFor=(c,p)=>board&&profile.pins.find(pin=>pin.id.startsWith('D')&&net(board.id,pin.id)===net(c.id,p))?.id;
 const signal=(c,p)=>{const pin=pinFor(c,p);return boardOn&&pin&&net(c.id,'-')===net(board.id,'GND')?(control.pins?.[pin]||0):0;};
 const source=(id,a,b,v)=>sources.push({id,a,b,v});
 for(const c of parts)if(c.type==='receiver'&&voltage(c.id)>=4.5&&voltage(c.id)<=5.5&&c.params.link>=.5){for(const [pin,value] of Object.entries({THR:c.params.throttle/100,ROLL:(c.params.roll+100)/200,PITCH:(c.params.pitch+100)/200,YAW:(c.params.yaw+100)/200,ARM:c.params.armed}))source(c.id+':'+pin,net(c.id,pin),net(c.id,'-'),value*3.3);}
 if(boardOn){for(const pin of Object.keys(control.pins||{}))source(board.id+':'+pin,net(board.id,pin),net(board.id,'GND'),clamp(control.pins[pin],0,1)*logic);}
 for(const c of parts){const v=voltage(c.id);if((catalog[c.type].sensorModel||['temperature','light','microphone','camera','thermal'].includes(c.type))&&v>=3&&v<=5.5){const spec=catalog[c.type].sensorModel;let ratio=spec?clamp((c.params.value-spec.min)/(spec.max-spec.min),0,1):c.params.value/100;if(c.type==='camera')ratio=visionPixels(c.params.value).score>=c.params.threshold?1:0;if(c.type==='microphone')ratio*=.8+.2*Math.sin(time*8);source(c.id+':OUT',net(c.id,'OUT'),net(c.id,'-'),ratio*Math.min(v,5));}if(c.type==='driver')source(c.id+':OUT',net(c.id,'OUT+'),net(c.id,'OUT-'),Math.max(0,v)*signal(c,'IN'));}
 iterate();
 if(boardOn){let supplyCurrent=0;for(const pin of Object.keys(control.pins||{})){const current=result.currents[board.id+':'+pin]||0;supplyCurrent+=Math.max(0,current);if(Math.abs(current)>.04)issue(board.id,'error',`${pin} aşırı akım`,`${(Math.abs(current)*1000).toFixed(0)} mA GPIO yükü var. Motoru GPIO'dan besleme; sürücü kullan. LED için seri direnci artır.`);}if(supplyCurrent)sinks.push({a:net(board.id,'5V'),b:net(board.id,'GND'),current:supplyCurrent});}
 for(const c of parts)if(c.type==='driver'){const out=Math.max(0,result.currents[c.id+':OUT']||0),duty=signal(c,'IN');sinks.push({a:net(c.id,'+'),b:net(c.id,'-'),current:out*duty});}if(sinks.length)iterate();
 if(board)for(const p of profile.pins.filter(p=>p.id.startsWith('A')||p.id.startsWith('D'))){if(voltage(board.id,p.id,'GND')>logic+.3)issue(board.id,'error',p.id+' giriş gerilimi yüksek','Kart mantık seviyesi '+logic+' V. Uygun gerilim bölücü veya seviye dönüştürücü kullan.');}
 // Reflect regulated output power in input current after downstream GPIO loads settle.
 for(const c of parts)if(c.type==='bec'&&becActive.has(c.id)){const out=Math.max(0,result.currents[c.id+':BEC']||0);sinks.push({a:net(c.id,'+'),b:net(c.id,'-'),current:out*c.params.output/Math.max(.1,voltage(c.id))});if(out>c.params.maxCurrent)issue(c.id,'error','BEC akım sınırı aşıldı',out.toFixed(2)+' A çıkış yükü; sınır '+c.params.maxCurrent+' A. Daha yüksek akımlı regülatör seç.');}
 if(sinks.length)iterate();
 const measures={};
 for(const c of parts){let v=isBoard(c.type)?voltage(c.id,'5V','GND'):['resistor','switch'].includes(c.type)?voltage(c.id,'a','b'):c.type==='bldc'?0:voltage(c.id);let current=0,sensor=0,target=0,rpm=0;const p=c.params;
 if(c.type==='battery')current=Math.max(0,result.currents[c.id]||0);
 if(c.type==='resistor')current=Math.abs(v)/p.resistance;
 if(c.type==='switch')current=Math.abs(v)/(p.closed>=.5?.02:1e12);
 if(c.type==='capacitor'){current=dt>0?p.capacitance*1e-6*(v-(motions[c.id]?.capacitorVoltage||0))/dt:0;if(v<-.1)issue(c.id,'warning','Kondansatör ters kutuplu','Bu modelde kutuplu kondansatör kullanılıyor. + ve − uçlarını kontrol et.');if(Math.abs(v)>p.voltageRating)issue(c.id,'error','Kondansatör gerilim sınırı aşıldı',`${v.toFixed(2)} V ölçülüyor; seçili gerilim sınırı ${p.voltageRating} V. Daha yüksek gerilim sınıfı veya daha düşük besleme kullan.`);}
 if(c.type==='led'){current=Math.max(0,(v-p.vf)/10);if(current*1000>p.maxCurrent+1)issue(c.id,'error','LED akımı çok yüksek',`${(current*1000).toFixed(1)} mA ölçülüyor; sınır ${p.maxCurrent} mA. Seri direnci artır. R ≈ (besleme − LED gerilimi) / hedef akım.`);if(v<-.5)issue(c.id,'warning','LED ters kutuplu','Anodu (+) yüksek potansiyele, katodu (−) dönüş hattına bağla.');}
 if(c.type==='servo'){current=v/62.5;const pin=pinFor(c,'SIG');if(boardOn&&v>=4.5&&v<=6&&net(c.id,'-')===net(board.id,'GND')&&pin in (control.servoPins||{}))target=clamp(control.servoPins[pin],0,p.maxAngle);else if(v>=4.5)issue(c.id,'warning','Servo sinyali bekleniyor','Servo.attach(pin) ve Servo.write(açı) kullan. SIG doğru pine, servo GND kart GND hattına bağlı olmalı.');if(v>6)issue(c.id,'error','Servo beslemesi yüksek',`${v.toFixed(1)} V ölçülüyor. Eğitim modeli 4.5–6 V aralığı içindir; uygun regülatör kullan.`);}
 if(c.type==='dcMotor'){current=Math.abs(v)/p.resistance;rpm=v*p.kv;}
 if(c.type==='buzzer')current=Math.abs(v)/250;if(c.type==='driver')current=Math.abs(v)/1000+Math.max(0,result.currents[c.id+':OUT']||0)*signal(c,'IN');
 if(c.type==='potentiometer'){sensor=voltage(c.id,'OUT','-');current=Math.abs(v)/p.resistance;}
 if(catalog[c.type].sensorModel){sensor=v>=3&&v<=5.5?c.params.value:0;current=v/1000;}
 if(['temperature','light','microphone','thermal','camera'].includes(c.type)){sensor=c.type==='camera'?(voltage(c.id,'OUT','-')>2.5?1:0):c.type==='microphone'?(voltage(c.id,'OUT','-')/5*100):(v>=3?p.value:0);current=v/1000;}
 if(c.type==='flight'&&boardOn&&control.env?.izin===0)issue(c.id,'warning','Motor çıkışları kilitli','Örnek kontrol kodunda gazı 0 yap, alıcı motor iznini 1 yap, sonra gazı artır. Kopan ARM hattı veya sinyal kaybı izni iptal eder.');
 if(c.type==='receiver'){current=Math.abs(v)/1000;if(c.params.link<.5)issue(c.id,'warning','Kumanda sinyali kesildi','Alıcı kanalları kapalı. Örnek kod ARM girişindeki kaybı algılayıp motor komutlarını sıfırlar.');if(v>5.5)issue(c.id,'error','Alıcı beslemesi yüksek','Alıcı 4.5–5.5V besleme ister. BEC çıkışını kontrol et.');}
 if(c.type==='bec')current=Math.abs(v)/1000+Math.max(0,result.currents[c.id+':BEC']||0)*c.params.output/Math.max(.1,Math.abs(v));
 if(c.type==='esc'&&v>0&&!pinFor(c,'SIG'))issue(c.id,'warning','ESC kontrol bağlantısı eksik','SIG girişini kontrol kartının PWM çıkışına bağla.');
 if(c.type==='esc'&&board&&net(c.id,'-')!==net(board.id,'GND'))issue(c.id,'warning','ESC ortak GND eksik','ESC ve kontrol kartının GND hatlarını birleştir.');
 if(c.type==='bldc'){const esc=parts.find(e=>e.type==='esc'&&['U','V','W'].every(ph=>net(e.id,ph)===net(c.id,ph))&&new Set(['U','V','W'].map(ph=>net(c.id,ph))).size===3);if(esc){v=voltage(esc.id);rpm=Math.max(0,v)*p.kv*signal(esc,'SIG');}else issue(c.id,'warning','Üç faz sürücüsü gerekli','BLDC motoru doğrudan bataryaya bağlama. ESC U, V, W çıkışlarını motorun üç ayrı fazına bağla.');}
 if(isBoard(c.type)){current=Math.max(0,v/250)+Object.keys(control.pins||{}).reduce((sum,pin)=>sum+Math.max(0,result.currents[c.id+':'+pin]||0),0);if(v>supply*1.1)issue(c.id,'error','Kart beslemesinde aşırı gerilim',`${v.toFixed(1)} V ölçülüyor. Bu profilde ${supply} V sanal besleme kullan; yüksek gerilim için regülatör gerekir.`);}
 if(!['battery','resistor','led','bldc','dcMotor','buzzer','capacitor','switch'].includes(c.type)&&v<.1)issue(c.id,'warning','Besleme veya dönüş hattı eksik','Önce VCC/+ ile GND/− arasındaki gerilimi ölç. Her iki uç da güç kaynağına ulaşmalı.');
 if((catalog[c.type].sensorModel||['temperature','light','microphone','thermal','camera'].includes(c.type))&&v>5.5)issue(c.id,'error','Sensör beslemesi yüksek','Sanal sensör modeli 3–5.5 V aralığında çalışır. Besleme değerini veya regülatörü kontrol et.');
 const unknownCurrent=c.type==='pdb'||c.type==='bldc'||c.type==='esc'||(c.type==='battery'&&parts.some(e=>e.type==='esc'&&net(e.id,'+')===net(c.id,'+')&&net(e.id,'-')===net(c.id,'-')));const m=motions[c.id]||{};measures[c.id]={voltage:Number.isFinite(v)?v:0,current:unknownCurrent?null:Number.isFinite(current)?Math.abs(current):0,power:unknownCurrent?null:Math.abs(v*current),angle:m.angle??0,rpm:m.rpm??0,target,targetRpm:rpm,sensor,brightness:c.type==='led'?clamp(current/.02,0,1):0,on:isBoard(c.type)?boardOn:c.type==='buzzer'?v>=2:v>=3};
 }
 for(const c of parts)if(c.type==='bec'){measures[c.id].outputVoltage=voltage(c.id,'OUT+','OUT-');measures[c.id].outputCurrent=becActive.has(c.id)?Math.max(0,result.currents[c.id+':BEC']||0):0;measures[c.id].on=becActive.has(c.id);}
 const adjacency=new Map();for(const e of [...resistors,...diodes,...sources]){if(!adjacency.has(e.a))adjacency.set(e.a,new Set());if(!adjacency.has(e.b))adjacency.set(e.b,new Set());adjacency.get(e.a).add(e.b);adjacency.get(e.b).add(e.a);}
 const measurementValid=!issues.some(i=>['Güç kaynağı kısa devre','Çıkış kısa devresi','Çakışan gerilim kaynakları','Devre çözülemiyor'].includes(i.title));for(const c of parts){measures[c.id].valid=measurementValid;measures[c.id].quality=['battery','resistor','potentiometer','switch'].includes(c.type)?'İdeal DC model hesabı':c.type==='capacitor'?'100 ms adımlı geçici rejim yaklaşımı':c.type==='led'?'Yaklaşık diyot modeli':'Davranış modeli tahmini';}
 const probe=(red,black)=>{if(!measurementValid)return{valid:false,reason:'Devre çözülemiyor: kısa devre veya çakışan kaynakları düzelt.'};if(!red||!black||!parent.has(key(red.part,red.pin))||!parent.has(key(black.part,black.pin)))return{valid:false,reason:'İki probu da geçerli bir pine yerleştir.'};const a=net(red.part,red.pin),b=net(black.part,black.pin),visited=new Set([a]),queue=[a];for(let q=0;q<queue.length;q++)for(const next of adjacency.get(queue[q])||[])if(!visited.has(next)){visited.add(next);queue.push(next);}if(!visited.has(b))return{valid:false,reason:'Problar ayrı, yüzen devre ağlarında. Ortak referans bulunamadı.'};return{valid:true,voltage:(result.values.get(a)||0)-(result.values.get(b)||0),sameNode:a===b};};
 return{measures,issues,measurementValid,boardOn,voltageAt:pin=>board?voltage(board.id,pin,'GND'):0,probe,time};
}
export function createSimulation(project){
 const boardPart=project.parts.find(c=>isBoard(c.type));const controller=runtime(compile(project.code),boardPart?catalog[boardPart.type]:catalog.board);const motions={};for(const c of project.parts)if(c.type==='capacitor')motions[c.id]={capacitorVoltage:0};let time=0,last=solve(project,controller,motions,0);
 return {controller,get time(){return time;},step(project,dt=.1){
 if(!Number.isFinite(dt)||dt<0)throw Error('Zaman adımı geçersiz.');time+=dt;
 for(const c of project.parts)if(c.type==='battery'){motions[c.id]??={};motions[c.id].empty=(motions[c.id].usedMah||0)>=c.params.capacity;}
 const initial=solve(project,controller,motions,time,dt);if(initial.boardOn&&dt>0){let signature=JSON.stringify([controller.pins,controller.modes]),reading=initial;controller.step(time*1000,pin=>{const next=JSON.stringify([controller.pins,controller.modes]);if(next!==signature){reading=solve(project,controller,motions,time,dt);signature=next;}return reading.voltageAt(pin);});}last=solve(project,controller,motions,time,dt);
 for(const c of project.parts){const m=last.measures[c.id];const old=motions[c.id]||{};motions[c.id]={...old,angle:(old.angle||0)+clamp(m.target-(old.angle||0),-dt*120,dt*120),rpm:(old.rpm||0)+(m.targetRpm-(old.rpm||0))*(1-Math.exp(-dt*4))};m.angle=motions[c.id].angle;m.rpm=motions[c.id].rpm;
 if(c.type==='capacitor'){if(dt>0)motions[c.id].capacitorVoltage=m.voltage;m.energy=.5*c.params.capacitance*1e-6*m.voltage*m.voltage;if(dt>0)m.current=c.params.capacitance*1e-6*(m.voltage-(old.capacitorVoltage||0))/dt;}
 if(c.type==='battery'){const s=motions[c.id];if(m.current===null)s.chargeUnknown=true;if(!s.chargeUnknown){s.usedMah=Math.min(c.params.capacity,(s.usedMah||0)+m.current*dt/3.6);s.usedJ=(s.usedJ||0)+m.current*Math.max(0,m.voltage)*dt;}m.remainingMah=s.chargeUnknown?null:Math.max(0,c.params.capacity-(s.usedMah||0));m.soc=m.remainingMah===null?null:m.remainingMah/c.params.capacity*100;m.energy=s.chargeUnknown?null:(s.usedJ||0);if(s.empty)last.issues.unshift({id:c.id,severity:'warning',title:'Batarya kapasitesi tükendi',detail:'Sabit gerilimli eğitim bataryası kapasite sınırına ulaştı. Simülasyonu sıfırlayarak yeniden doldurabilirsin. Kimyasal deşarj eğrisi modellenmez.'});}
 }
 if(controller.error)last.issues.unshift({id:project.parts.find(c=>isBoard(c.type))?.id,severity:'error',title:'Kod yürütme hatası',detail:controller.error});return last;},snapshot(){return last;}};
}
