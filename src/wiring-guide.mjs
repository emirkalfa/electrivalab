import {catalog,isBoard} from './catalog.mjs';
// Suggestions describe this simulator's pins, never a manufacturer's physical pinout.
export function wiringGuide(project,partId){
 const c=project.parts.find(p=>p.id===partId);if(!c)return null;
 const board=project.parts.find(p=>isBoard(p.type)),profile=board&&catalog[board.type],logic=profile?.logic||5;
 const key=(id,p)=>id+':'+p,parent=new Map();
 for(const p of project.parts)for(const pin of catalog[p.type].pins)parent.set(key(p.id,pin.id),key(p.id,pin.id));
 const find=x=>{while(parent.has(x)&&parent.get(x)!==x)x=parent.get(x);return x;};
 const join=(a,b)=>parent.set(find(a),find(b));
 for(const w of project.wires)join(key(w.from.part,w.from.pin),key(w.to.part,w.to.pin));
 for(const p of project.parts){if(['bec','driver'].includes(p.type))join(key(p.id,'-'),key(p.id,'OUT-'));if(p.type==='pdb')for(let i=1;i<=4;i++){join(key(p.id,'+'),key(p.id,'P'+i));join(key(p.id,'-'),key(p.id,'N'+i));}}
 const same=(a,ap,b,bp)=>find(key(a.id,ap))===find(key(b.id,bp));
 const label=(p,pin)=>p.name+' / '+(catalog[p.type].pins.find(x=>x.id===pin)?.label||pin);
 const ends=(pin)=>project.parts.flatMap(p=>p.id===c.id?[]:catalog[p.type].pins.filter(x=>same(c,pin,p,x.id)).map(x=>({part:p.id,pin:x.id,label:label(p,x.id)})));
 const busy=(p,pin)=>project.wires.some(w=>[w.from,w.to].some(e=>e.part===p.id&&e.pin===pin));
 function phasePeer(type){
  const peers=project.parts.filter(p=>p.type===type);
  const linked=peers.filter(p=>['U','V','W'].some(ph=>same(c,ph,p,ph)));
  if(linked.length>1)return [];
  const chosen=linked[0]||peers.find(p=>['U','V','W'].every(ph=>!busy(p,ph)));
  return chosen?[chosen]:[];
 }
 const rows=[],notes=['Bu rehber uygulamadaki eğitim pinlerine göredir; fiziksel kartın pin dizilimi değildir. Öneri kabloyu otomatik bağlamaz.'];
 const candidates=(type,pins)=>project.parts.filter(p=>p.id!==c.id&&type(p)).flatMap(p=>pins(p).map(pin=>({p,pin})));
 function row(pin,options=[],hint='',allowShared=false){
  const connected=ends(pin),valid=options.find(o=>same(c,pin,o.p,o.pin));
  const option=valid||options.find(o=>allowShared||!busy(o.p,o.pin));
  let state=valid?'connected':connected.length&&options.length?'check':option?'todo':options.length?'busy':'info';
  rows.push({pin,label:catalog[c.type].pins.find(p=>p.id===pin)?.label||pin,current:connected.map(e=>e.label),target:option?label(option.p,option.pin):null,targetPart:option?.p.id,targetPin:option?.pin,state,hint:hint+(state==='busy'?' Uygun pinlerin hepsi kullanılıyor; mevcut bağlantıyı kaldırmadan aynı sinyal çıkışına ekleme.':'')});
 }
 const supplyOptions=(min,max)=>project.parts.filter(p=>p.id!==c.id).flatMap(p=>p.type==='battery'&&p.params.voltage>=min&&p.params.voltage<=max?[{p,pin:'+'}]:p.type==='bec'&&p.params.output>=min&&p.params.output<=max?[{p,pin:'OUT+'}]:[]);
 function power(min,max,pos='+',neg='-'){
  const options=supplyOptions(min,max);row(pos,options,min+'–'+max+' V besleme gerekir. '+(!options.length?'Uygun DC kaynak veya BEC ekle/ayarla.':'Kaynağın belirtilen gerilimi nominal ayarıdır; çalışırken ölç.'),true);
  const source=options.find(o=>same(c,pos,o.p,o.pin))||options[0];
  const grounds=source?[{p:source.p,pin:source.p.type==='bec'?'OUT-':'-'}]:board&&board.id!==c.id?[{p:board,pin:'GND'}]:[];
  row(neg,grounds,'Besleme dönüşü. Kontrol sinyali kullanıyorsan kart GND ile de ortak olmalı.',true);
 }
 function gpio(pin,kind='digital'){
  if(!board){row(pin,[],'Kontrol kartı ekle; ardından karta uygun pin önerisi burada görünecek.');return;}
  const pins=profile.pins.filter(p=>kind==='analog'?p.id.startsWith('A'):kind==='pwm'?profile.pwm.includes(p.id):p.id.startsWith('D'));
  if(kind==='servo'&&board.type==='flight')pins.sort((a,b)=>(Number(a.id.slice(1))<5)-(Number(b.id.slice(1))<5));
  row(pin,pins.map(p=>({p:board,pin:p.id})),kind==='analog'?'Analog giriş. Kodda analogRead(seçilen A pini) kullan. Çıkış '+logic+' V mantık seviyesini aşmamalı.':kind==='servo'?'Kodda Servo.attach(seçilen D/GP numarası) ve Servo.write(açı) kullan.':kind==='pwm'?'Kodda analogWrite(seçilen D/GP numarası, 0–255) kullan. Bu model ortalama PWM kullanır.':'Seçilen pinin görevini kontrol kodunda tanımla.');
 }
 if(isBoard(c.type)){
  const supply=profile.supply||logic;power(supply*.9,supply*1.1,'5V','GND');
  notes.push('Kart mantık seviyesi '+logic+' V. Besleme pini bu modelde giriştir; motoru buradan besleme.');
  for(const p of profile.pins.filter(p=>!['5V','GND'].includes(p.id))){
   let opts=[],hint='';
   if(p.id.startsWith('A')){const ch=['THR','ROLL','PITCH','YAW','ARM'][Number(p.id.slice(1))];opts=candidates(x=>x.type==='receiver',()=>ch?[ch]:[]);opts.push(...candidates(x=>catalog[x.type].sensorModel||['potentiometer','temperature','light','microphone','thermal','camera'].includes(x.type),()=>['OUT']));hint='Analog giriş; '+logic+' V üstüne çıkma. Kodda analogRead('+p.id+').';}
   else {opts=candidates(x=>['esc','driver','servo'].includes(x.type),x=>[x.type==='driver'?'IN':'SIG']).filter(o=>o.p.type==='servo'||profile.pwm.includes(p.id));hint='Çıkış görevini kod belirler. '+(profile.pwm.includes(p.id)?'ESC/sürücü için analogWrite; ':'')+'Servo için attach/write. Motor gücünü GPIO üzerinden verme.';}
   row(p.id,opts,hint);
  }
 }else if(c.type==='servo'){power(4.5,6);gpio('SIG','servo');}
 else if(c.type==='esc'){power(.1,24);gpio('SIG','pwm');for(const ph of ['U','V','W'])row(ph,phasePeer('bldc').map(p=>({p,pin:ph})),'Aynı motorun üç ayrı fazını U→U, V→V, W→W bağla. Öneri yoksa boş bir motor ekle veya dağılmış faz bağlantılarını düzelt.');notes.push('BAT+ motor beslemesidir; 5V sensör hattıyla karıştırma. Modelde ESC/BLDC akımı hesaplanmaz.');}
 else if(c.type==='bldc'){for(const ph of ['U','V','W'])row(ph,phasePeer('esc').map(p=>({p,pin:ph})),'Üç fazın tamamını aynı ESC’ye bağla. Öneri yoksa boş bir ESC ekle veya dağılmış faz bağlantılarını düzelt. Doğrudan bataryaya veya GPIO’ya bağlama.');}
 else if(c.type==='driver'){power(.1,24);gpio('IN','pwm');row('OUT+',candidates(p=>p.type==='dcMotor',()=>['+']),'Motorun M+ ucu.');row('OUT-',candidates(p=>p.type==='dcMotor',()=>['-']),'Motorun M− ucu.',true);}
 else if(c.type==='dcMotor'){row('+',candidates(p=>p.type==='driver',()=>['OUT+']),'PWM kontrolü için DC motor sürücüsü ekle. Doğrudan GPIO beslemesi kullanma.');row('-',candidates(p=>p.type==='driver',()=>['OUT-']),'Sürücünün motor dönüş ucu.',true);}
 else if(c.type==='receiver'){
  power(4.5,5.5);['THR','ROLL','PITCH','YAW','ARM'].forEach((pin,i)=>{const target=board&&profile.pins.find(p=>p.id==='A'+i);row(pin,target?[{p:board,pin:target.id}]:[],target?'Örnek eşleme: '+pin+' → A'+i+'. Mevcut kod bu kanalı başka girişten okuyorsa eşlemeyi kodla birlikte değiştir.':'Bu kanal için A'+i+' bulunmuyor. Beş kanal için Electriva uçuş kartı gibi en az beş ADC girişli kart seç.');});notes.push('Bu alıcı 0–3.3V analog adaptördür. Gerçek SBUS/CRSF bağlantısı değildir. İlk motor iznini gaz sıfırken ver.');
 }else if(c.type==='bec'){power(c.params.output+1,24);row('OUT+',[],c.params.output+' V regüle besleme: uygun gerilimli kartın besleme girişine, alıcıya veya servoya dağıt. Çıkışı başka kaynak çıkışıyla birleştirme.');row('OUT-',[], 'Yüklerin GND uçlarına ve kontrol kartı GND ucuna bağla.');}
 else if(c.type==='pdb'){power(.1,24);for(let i=1;i<=4;i++){row('P'+i,candidates(p=>p.type==='esc',()=>['+']),'ESC BAT+ veya BEC VIN+. Bu çıkış batarya gerilimini aynen taşır.');row('N'+i,candidates(p=>p.type==='esc',()=>['-']),'Aynı yükün GND ucu.',true);}notes.push('PDB gerilim düşürmez; yüksek gerilimli bataryadan kart/servo beslemek için BEC kullan.');}
 else if(c.type==='potentiometer'||catalog[c.type].sensorModel||['temperature','light','microphone','thermal','camera'].includes(c.type)){power(c.type==='potentiometer'?.1:3,Math.min(5.5,logic));gpio('OUT','analog');}
 else if(c.type==='buzzer'){power(2,5.5);notes.push('Bu aktif buzzer beslenince öter. Kodla kontrol etmek için uygun sürücü kullan; seri direnç gerilimi eşik altına düşürebilir.');}
 else if(c.type==='battery'){row('+',[],c.params.voltage+' V kaynak çıkışı: yükün + ucuna veya BEC/PDB girişine bağla. Yükün izin verilen gerilimini kontrol et.');row('-',[], 'Yüklerin dönüş hattı ve kontrol kartı GND ile ortak referans.');notes.push('Kaynağın + ve − uçlarını birbirine bağlama; farklı gerilimli kaynak çıkışlarını birleştirme.');}
 else if(c.type==='led'){row('+',candidates(p=>p.type==='resistor',()=>['a','b']),'Anot seri direnç üzerinden uygun kaynağa/GPIO’ya gider. R ≈ (besleme − LED ileri gerilimi) / hedef akım.');row('-',board?[{p:board,pin:'GND'}]:supplyOptions(.1,24).map(o=>({p:o.p,pin:o.p.type==='bec'?'OUT-':'-'})),'Katot ortak GND hattına.',true);}
 else {for(const p of catalog[c.type].pins)row(p.id,[],c.type==='resistor'?'Direnci akımı sınırlamak istediğin yükle seri bağla; A ve B yönsüzdür.':c.type==='capacitor'?(p.id==='+'?'Pozitif ucu daha yüksek potansiyele bağla; gerilim sınırı '+c.params.voltageRating+' V.':'Negatif ucu dönüş/GND hattına bağla.'):c.type==='switch'?'Anahtarı açıp kapatılacak hattın arasına seri koy; A ve B yönsüzdür.':'Bu pinin görevi için bileşen model açıklamasını kontrol et.');}
 return {board:board?board.name:'Kontrol kartı yok',logic:board?logic:null,rows,notes};
}
