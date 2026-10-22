# ElectrivaLab

Elektronik devreleri kurmak, kontrol kodu yazmak ve ölçerek öğrenmek için çevrimdışı çalışan masaüstü laboratuvarı.

## Özellikler

- 52 bileşenden oluşan kütüphane: kontrol kartları, sensörler, motorlar ve güç bileşenleri.
- Pinleri kablolarla bağlama, bileşen parametrelerini değiştirme, geri alma ve yineleme.
- Arduino Uno, Nano, Mega, ESP32, Pico ve Electriva uçuş eğitim kartı profilleri.
- Direnç ağları için DC düğüm analizi; RC devreleri için zaman adımlı hesaplama.
- Gerilim probları, pin ölçümleri, canlı grafikler ve CSV ölçüm çıktısı.
- Devreden besleme alan aktif buzzer için ses; motor ve servo hareketleri.
- Bağlantı hatalarını açıklayan hata dedektifi ve seçili karta göre öneri veren **? bağlantı rehberi**.
- Drone için dört ESC/BLDC motor, uçak için motor ve üç servo içeren hazır devreler.
- Projeleri cihazda saklama ve JSON dosyası olarak içe/dışa aktarma.

## Çalıştırma

Node.js ve npm gerekir. Windows masaüstü uygulaması Electron kullanır.

```sh
npm ci
npm run desktop
```

Tarayıcı sürümü için:

```sh
npm start
```

Ardından [yerel uygulamayı](http://127.0.0.1:5180) aç.

## Masaüstü paketi

```sh
npm run package:desktop
```

Paketleme betiği Windows x64 uygulamasını sürüme özel bir klasörde üretir. Mevcut sürümün çıktısı:
`dist/0.1.6/ElectrivaLab-win32-x64/ElectrivaLab.exe`.
Aynı çıktı klasörü zaten varsa betik üzerine yazmaz.

## Kullanım

1. **Deneyler** bölümünden bir devre aç veya kütüphaneden parçalar ekle.
2. Bir pine, ardından hedef pine tıklayarak kablo oluştur.
3. Parçayı seç; sağ paneldeki **?** düğmesinden karta uygun bağlantı önerilerini incele.
4. Kontrol kodundaki pinlerin bağlantılarla eşleştiğini kontrol et ve simülasyonu başlat.
5. Parametreleri değiştir; ölçümleri, grafikleri ve hata dedektifini izle.

Drone/uçak örneklerinde alıcıda gaz **0** iken motor iznini **1** yap, ardından gazı artır.
Sinyal kaybından sonra tekrar izin almak için gazı sıfıra döndür.
Projeyi yedeklemek için **Dışa aktar** seçeneğini kullan.

## Model sınırları

Bu uygulama bir eğitim simülatörüdür. Gerçek donanım tasarımını üretmeden önce üretici belgeleri ve fiziksel ölçümlerle doğrula.

- Kartlar seçili GPIO/ADC/PWM işlevlerine sahip eğitim profilleridir; işlemci veya tam firmware emülasyonu yoktur.
- Kod stüdyosu sınırlı bir Arduino benzeri yorumlayıcıdır; tam C++ derleyicisi değildir.
- PWM ortalama gerilim olarak hesaplanır. RC zaman adımı 100 ms, LED modeli yaklaşıktır.
- Sensörler açıklanmış davranış modelleridir; gerçek I²C/SPI cihaz emülasyonu yoktur.
- Uçuş devreleri yalnızca elektronik bağlantılar içindir. Uçuş fiziği, otomatik dengeleme, SBUS/CRSF/DShot ve gerçek uçuş firmware’i yoktur.
- ESC/BLDC akımları hesaplanmaz; bilinmeyen akım ve bunlara bağlı batarya tüketimi boş gösterilir. LiPo kimyası modellenmez.
- BEC ideal regülatördür; aşırı yük uyarısı verir, termal kapanma hesaplamaz.
- Bir projede en fazla 60 bileşen, 180 kablo ve bir kontrol kartı desteklenir.
- Bağlantı rehberi uygulamadaki pinlere göredir; fiziksel kart pin dizilimi veya kontrol kodunun otomatik doğrulanması değildir.

## Kontroller

```sh
npm run check
npm test
```

Testler elektriksel hesaplamaları, hata durumlarını, motor/servo kontrolünü, sinyal kaybını, bağlantı rehberini ve masaüstü dosya erişim sınırlarını kapsar.

## Proje yapısı

- `src/`: arayüz, katalog, devre motoru, kod yorumlayıcısı ve bağlantı rehberi.
- `desktop/`: Electron uygulaması ve Windows paketleme betiği.
- `tests/`: otomatik testler.
- `server.mjs`: yerel geliştirme sunucusu.

## Lisans

Copyright © 2026 emirkalfa. Proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
Bağımlılıklar kendi lisanslarına tabidir.
