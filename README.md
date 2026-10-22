# VoltLab

Eğitici elektronik laboratuvarının çalışan ilk sürümü. Bileşen ekle, pinleri kablola, desteklenen Arduino kodunu çalıştır, sanal ortamı değiştir ve ölçümleri incele.

## Açılış

Node.js 22+ gerekir. Harici npm bağımlılığı yoktur.

```powershell
npm.cmd start
```

Tarayıcıda http://127.0.0.1:5180 adresini aç. İnternet bağlantısı, hesap ve API anahtarı gerekmez. Bu sürüm tarayıcıda çalışan yerel bir uygulamadır; masaüstü kurulum paketi değildir.

## Kullanım

1. Örnek servo deneyiyle başla veya Deneyler → Boş laboratuvar aç seç.
2. Soldaki kütüphaneden bileşen ekle; bileşeni çalışma alanında sürükle.
3. Bir bağlantı pinine, ardından hedef pine tıklayarak kablo oluştur. Kabloya tıklayıp sağ panelden kaldırabilirsin. Esc bekleyen bağlantıyı iptal eder.
4. Sağ panelde batarya gerilimi, direnç, motor KV değeri veya sanal sensör ortamını değiştir.
5. Kod stüdyosunda kodu düzenle ve Simülasyonu başlat. Çalışma sırasında potansiyometre/sensör sürgüsünü değiştirebilirsin.
6. Bileşen seçerek gerilim, akım, güç, açı/hız veya sensör ölçümünü izle. Grafik türünü seç; son 30 saniyelik tüm bileşen ölçümlerini CSV olarak indir.
7. Hata dedektifindeki satıra tıklayınca ilgili bileşen seçilir. Kısa devre ve aşırı gerilim gibi hatalar devre üzerinde işaretlenir.
8. Kaydet bu tarayıcı kökenine yazar. Taşınabilir yedek için JSON dışa aktar. İçe aktarma sırasında biçim, değer aralıkları ve bağlantılar doğrulanır.

Ctrl+Z: geri al. Ctrl+Shift+Z: yinele. Delete: seçili bileşen/kabloyu kaldır. /: kütüphane ara. Ctrl+tekerlek veya araç çubuğu: yakınlaştır. Boş alanda sürükle: kaydır.

## Kütüphane ve örnekler

48 bileşen (5 kontrol kartı profili ve 31 sensör/dijital giriş modeli dahil): DC kaynak, sanal Arduino Uno, direnç, kondansatör, anahtar, LED, potansiyometre, servo, DC motor, DC sürücü, ESC, BLDC, sıcaklık, ışık, ses sensörü, buzzer, sanal termal dizi, sanal görüntü sensörü.

Beş hazır deney: servo + LED kontrolü, DC motor sürücüsü, BLDC/ESC bağlantısı, sıcaklık alarmı ve sanal görüntü/termal sensörler, RC şarj/deşarj.

Araç çubuğundaki voltmetreyi aç; kırmızı ve siyah prob için pin seç. Okuma V(kırmızı) − V(siyah) olarak hesaplanır. Ayrı, yüzen ağlar arasında sonuç verilmez. Bu ideal DC voltmetre devreyi yüklemez; direnç/akım ölçüm modu yoktur. Kablo bağlamaya dönmek için voltmetreyi kapat.

RC deneyi 100 ms adımlı backward Euler çözümü kullanır; başlangıç gerilimi sıfırdır. ESR, kaçak, yüksek frekans ve kimyasal etkiler yoktur. Zaman sabiti 100 ms'den çok küçük devrelerde ayrıntı kaybolur. Kondansatör gerilimi, işaretli akımı ve depolanan enerjisi izlenebilir. Anahtar açıkken 1 TΩ, kapalıyken 0.02 Ω olarak modellenir.

Batarya tüketimi hesaplanabilen yüklerde I × dt ile kapasiteden düşülür. Şarj yüzdesi ve tüketilen enerji grafikte seçilebilir. Kapasite tükenince bir sonraki adımda gerilim sıfırlanır; sıfırlama bataryayı doldurur. Sabit gerilim modeli kimyasal deşarj eğrisini ve şarjı kapsamaz. ESC/BLDC yükünün akımı modellenmediğinden ilgili bataryanın şarjı ve enerjisi bilinmiyor olarak gösterilir. Dinamik durum proje dosyasına kaydedilmez.

## Model kapsamı

- İdeal kablolar için düğüm birleştirme; DC direnç ağı için değiştirilmiş düğüm analizi ve kısmi pivotlu lineer çözüm. Yalıtılmış düğümler için çok küçük sayısal kaçak iletkenlik vardır.
- LED: ileri gerilim + 10Ω eğimli, parçalı doğrusal model. Ters kutup ve akım sınırı kontrolü.
- Potansiyometre: iki gerçek direnç dalı; slider uçlarında sayısal kararlılık için minimum 1Ω.
- PWM: 0–255 değerinden ortalama gerilim. Anahtarlama kenarları ve yüksek frekanslı osiloskop çözümü yoktur. Grafik 10Hz örnekli davranış sinyalidir.
- Servo: güç ve komut doğrulaması, 120°/s açı yaklaşımı; sabit yaklaşık besleme yükü. Yük torku, stall ve mekanik çarpışma yoktur.
- DC motor: gerilim×KV hedef hızı, birinci dereceden yaklaşım; akım sabit eşdeğer dirençten. Geri EMK, endüktans ve mekanik yük yoktur. Sürücü ideal kayıpsız tek yönlü modeldir.
- BLDC: ESC/faz bağlantısı doğrulaması, KV×besleme×gaz hedef hızı. Gaz bu uygulamada analogWrite üzerinden verilir. Gerçek ESC PWM protokolü, komütasyon ve faz akımları modellenmez; BLDC akımı gösterimi fiziksel ölçüm sayılmaz.
- Sensörler: kullanıcı tarafından ayarlanan sentetik ortamlar. Sıcaklık 0–100°C → 0–5V eğitim eşlemesi; belirli entegrelerin emülasyonu değildir.
- Kamera: üretilen 16×12 sahnedeki kırmızı piksel oranına göre eşikleme. Gerçek kamera, Arduino üzerinde görüntü işleme veya OpenCV yoktur.
- Termal dizi: sentetik 8×8 sıcaklık alanı. I²C protokolü ve ısı transferi modeli yoktur.
- Ses sensörü sanal ses seviyesini ölçer; ses üretimi aktif buzzer ile, kullanıcının ses düğmesini açmasıyla olur.
- Batarya şarjı hesaplanan akımdan izlenir; kimyasal deşarj eğrisi ve iç direnç modellenmez.

## Kod yürütme

`src/code.mjs` bağımsız tokenizer/parser ve kısıtlı yorumlayıcıdır; kullanıcı kodu eval/Function ile çalıştırılmaz. setup ve loop, sayısal değişkenler, işlemler, if/else, pinMode, digitalWrite, analogWrite, analogRead, digitalRead, delay, map, constrain, Servo.attach/write ve Serial.begin/println desteklenir. Proje başına tek kontrol kartı; D3/D5/D6/D9/D10/D13 ve A0/A1/A2 pinleri. D13 PWM desteklemez.

Tam Arduino C++, AVR komut seti, SPI/I²C/UART protokol emülasyonu, harici kütüphaneler, while/for ve kullanıcı fonksiyonları desteklenmez. Kod değiştirilince simülasyon sıfırlanır. Aynı yürütme adımında işlem bütçesi uygulanır. 10Hz zaman adımı nedeniyle delay zamanları örnekleme çözünürlüğüne yuvarlanır.

## Kontroller

```powershell
npm.cmd test
npm.cmd run check
```

Testler elektriksel sonuçları, kısa devre/ters kutup, servo/ADC ilişkisini, ortak GND gereksinimini, motor/ESC kontrolünü, sıcaklık alarmını, kod hata izolasyonunu ve proje doğrulamasını kapsar.

## Sonraki ürün aşamaları

1. Doğrulanmış parça modelleri ve sürümlü model sözleşmesi; kullanıcı parça kütüphaneleri.
2. Gelişmiş kondansatör/endüktör/MOSFET ve geçici rejim için SPICE adaptörü; gerçek zaman adımı ve solver hata raporları.
3. Firmware/AVR emülatörü ve protokol seviyesinde çevre birimleri; daha fazla kontrol kartı.
4. Kameradan gerçek veri alma, görüntü işleme bloğu, I²C termal sensör modelleri.
5. Breadboard, netlist dışa aktarma, kontrollü PCB araç entegrasyonu, ders ve ölçüm raporları.

Başlangıçta rastgele tüm elektronik parçaları kusursuz simüle etme iddiası yoktur. Destek kapsamı her bileşenin özellik panelinde görünür; öneriler açıklanabilir kurallardan gelir.

Referans API adları: [Arduino analogWrite](https://docs.arduino.cc/language-reference/en/functions/analog-io/analogWrite/), [Arduino Servo](https://docs.arduino.cc/libraries/servo/).

## Genişletilen sensör ve kart kütüphanesi

Deneyler → Kendi sensör deneyini kur bölümünden 26 yeni sensör/giriş ve beş kart profilini eşleştir. Devre beslemesi ve A0 bağlantısı otomatik kurulur. Ortam değerini sağ panelden değiştir; Sensör değeri grafiği fiziksel birimi, Seri monitör kartın ADC sayısını gösterir.

Kartlar: Uno, Nano, Mega 2560, ESP32 ve Pico. Tümünde ortak Arduino benzeri kod alt kümesi kullanılır. Nano/Mega 5V ve 10 bit, ESP32/Pico 3.3V ve normalize edilmiş 12 bit ADC eğitim profili kullanır. Gerçek ESP32 ADC doğrusal olmama/attenuation etkileri modellenmez. Mega ve diğer kartlarda yalnızca katalogdaki pin alt kümesi kullanılabilir. Pico/ESP32 A pinleri sanal ADC takma adlarıdır; gerçek pin eşlemesi veya firmware desteği iddiası yoktur. 3V3 etiketli sanal besleme girişi fiziksel kart besleme talimatı değildir.

Yeni sensörler: nem, mesafe, basınç, toprak nemi, gaz, duman, CO₂, kuvvet, yük hücresi, eğim, tek eksen ivme, tek eksen jiroskop, manyetik alan, dönüş konumu, titreşim, UV, su, yağmur, pH, akış, PIR, dokunma, Hall, alev, çizgi ve buton modülü. Analog modellerde belirtilen min/max fiziksel değer 0/VCC arasına doğrusal ölçeklenir; dijital modeller 0/VCC üretir. Gerçek ultrasonik echo/trig, I²C/SPI sensör sürücüleri ve üretici kütüphaneleri henüz yoktur.

Profil referansları: [Arduino Mega](https://docs.arduino.cc/hardware/mega-2560), [Arduino Nano ailesi](https://support.arduino.cc/hc/en-us/articles/11264980365468-Nano-family-overview), [Pico datasheet](https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf), [ESP32 datasheet](https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf).

## Sağlamlık denetimi — 22 Ekim 2026

54 otomatik test geçiyor. Sensör/kart kombinasyon testi 130 eşleşmeyi; deterministik devre testi 300 farklı direnç/besleme durumunu kapsar. Ek kontroller geçersiz pinler, komut argümanları, PWM desteği, yorum içeren metinler, iç içe kod sınırı, hatalı proje kimlikleri ve INPUT_PULLUP davranışını kapsar. INPUT_PULLUP 20kΩ eğitim direncidir; girişin aynı kod adımındaki değişiklikleri okumalara yansır.

Bu testler tanımlı davranışlar için regresyon kanıtıdır; tüm olası devreler, tarayıcılar veya gerçek donanım için sıfır hata kanıtı değildir. Model sınırları yukarıda ve bileşen panelinde belirtilmiştir.

## Windows masaüstü uygulaması

Paket: `dist/VoltLab-win32-x64/VoltLab.exe`. Klasörün tamamını birlikte tut; yalnızca exe dosyasını taşımak yeterli değildir. Node.js ve tarayıcı kurulumu gerektirmez; yerel sunucu başlatmaz.

Geliştirme: `npm ci`, ardından `npm run desktop`. Windows x64 paketi: `npm run package:desktop`. Paketleme aynı çıktı klasörünün üzerine yazmaz; mevcut çıktıyı korumak için farklı klasöre taşı veya paketleme ayarındaki out değerini değiştir.

Masaüstünün kayıtları tarayıcıdaki kayıtlardan ayrıdır. Eski devreni tarayıcıda Dışa aktar ile JSON olarak kaydet; masaüstünde klasör düğmesiyle içe aktar ve Kaydet seç. Uygulama verisi Electron userData klasöründe tutulur. Yedek için JSON dışa aktar. Pencereyi kapatırken kaydedilmemiş değişiklikler sorulur.

Uygulama yalnızca paketlenmiş HTML/CSS/JS dosyalarını özel voltlab protokolü üzerinden sunar. Renderer Node.js erişimi kapalı, contextIsolation ve sandbox açıktır. Harici gezinmeler ve yeni pencereler engellenir. Kamera/mikrofon izinleri verilmez; sensörler sanal modellerdir.

## 0.1.2 — ses ve ölçüm geçerliliği

Sesi dene düğmesi devreden bağımsız 800Hz kısa ton üretir. Buzzer kare dalga ve daha belirgin ses seviyesi kullanır. AudioContext running durumuna geçmezse başarı bildirimi verilmez. Donanımdan işitilebilirlik otomatik testlerle kanıtlanmamıştır.

Sağ panelde pin gerilimleri varsayılan olarak ilk bataryanın eksi ucuna, voltmetrede siyah prob seçildiyse o pine göre hesaplanır. Ayrı yüzen ağlar için değer gösterilmez. İdeal kaynak kısa devresi, çıkış kısa devresi, çakışan kaynak veya çözülemeyen ağ varsa ölçümler ve grafik geçersizdir; CSV satırlarında ölçümler boş bırakılır ve measurement_valid=false yazılır. Etiketler ideal DC hesabı ile yaklaşık/davranış modellerini ayırır. Bu değişiklik fiziksel model doğruluğunu artıran SPICE veya firmware emülasyonu değildir.

Windows paketi: dist/0.1.2/VoltLab-win32-x64/VoltLab.exe. Yeni sürüme geçmeden önce açık uygulamada projeyi kaydet ve uygulamayı kapat; masaüstü kısayolu yeni pakete bağlıdır. 60 otomatik test geçmiştir.

## 0.1.3 — devreye bağlı otomatik buzzer sesi

Simülasyonu başlat düğmesi ses motorunu da etkinleştirir. Ayrı ses açma adımı gerekmez. Buzzer sesi, çözülen devrede buzzer beslemesi yeterliyse üretilir; devre geçersizse, buzzer enerjisizse veya simülasyon duraklatılmışsa kesilir. Hoparlör düğmesi isteğe bağlı genel susturmadır. 0.1.2 sürümündeki bağımsız ses denemesi kaldırılmıştır. Devre beslemesi/ses çıkışı/duraklatma/bağlantı kesilmesi testi geçti; fiziksel hoparlörden işitilebilirlik uzaktan doğrulanmadı.


## ElectrivaLab · 0.1.4
Yeni mavi–turkuaz kimlik, devre E logosu ve Windows simgesi. Kayıt uyumluluğu için dahili voltLab/voltlab depolama anahtarları ve protokol korunur. Electrolab adı kullanıldığı için ElectrivaLab seçildi; ön web taraması marka tescil uygunluğunu garanti etmez.

## 0.1.5 · Uçuş elektroniği devreleri
Electriva uçuş eğitim kartı (5V besleme / 3.3V mantık), beş kanallı analog kumanda adaptörü, ideal BEC ve dört çıkışlı güç dağıtım kartı eklendi. Deneyler: drone dört motor devresi ve uçak motor + üç servo devresi. Simülasyonu başlat, alıcıda gaz sıfırken motor iznini aç, ardından gazı artır. Sinyal kaybı sonrası yeniden izin için gaz sıfıra dönmelidir. Kod stüdyosunda kanal-motor karıştırma ve servo eşlemesini düzenleyebilirsin.

Bu sürüm yalnızca devre içindir: gerçek uçuş firmware’i, SBUS/CRSF/DShot, fiziksel radyo, uçuş dinamiği veya IMU tabanlı dengeleme yoktur. ESC/BLDC akımı ve LiPo kimyası modellenmez; bilinmeyen akımlar boş gösterilir. BEC ideal güç aktarımı kullanır, aşırı yükü bildirir ama termal kapanma simüle etmez. PDB kol akımları hesaplanmaz.

## 0.1.6 · Karta göre bağlantı rehberi
Parçayı seçip sağdaki ? düğmesine bas. Rehber devredeki kontrol kartının mevcut pinleri, mantık gerilimi ve kablo ağlarına göre besleme/sinyal uçlarını önerir; dolu pinleri atlar ve var olan uygun bağlantıyı korur. Uçuş devrelerinde PDB/BEC iç bağlantıları ve üç fazın aynı ESC’ye gitmesi dikkate alınır. Öneriler eğitim modellerine göredir, gerçek donanım pinout doğrulaması veya kod analizi değildir. Seçilen sinyal pinini kontrol kodunda da kullan.
