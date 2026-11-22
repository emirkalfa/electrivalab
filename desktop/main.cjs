const { app, BrowserWindow, protocol, dialog, Menu } = require('electron');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { resolveAsset } = require('./paths.cjs');

protocol.registerSchemesAsPrivileged([{ scheme: 'voltlab', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
const locked = app.requestSingleInstanceLock();
let mainWindow;
if (!locked) app.quit();
else {
  const reveal = () => { if (mainWindow && !mainWindow.isDestroyed()) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } };
  app.on('second-instance', reveal);
  app.whenReady().then(async () => {
    protocol.handle('voltlab', async request => {
      const asset = resolveAsset(request.url, path.join(__dirname, '..'));
      if (!asset || request.method !== 'GET') return new Response('Not found', { status: 404 });
      try {
        return new Response(await readFile(asset.path), { headers: {
          'Content-Type': asset.mime,
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'",
          'X-Content-Type-Options': 'nosniff'
        } });
      } catch { return new Response('Not found', { status: 404 }); }
    });
    mainWindow = new BrowserWindow({ width: 1440, height: 940, minWidth: 1000, minHeight: 680, autoHideMenuBar: true, title: 'ElectrivaLab', backgroundColor: '#102443', icon: path.join(__dirname, '..', 'src', 'app-icon.ico'), show: true,
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false }
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'ElectrivaLab', submenu: [{ label: 'Uygulama hakkında', click: () => dialog.showMessageBox(mainWindow, { type: 'info', title: 'ElectrivaLab', message: 'ElectrivaLab masaüstü', detail: 'Çevrimdışı elektronik eğitim laboratuvarı · ' + app.getVersion() + '\nProjeler bu uygulamanın yerel deposunda tutulur. Taşınabilir yedek için Dışa aktar seçeneğini kullan.' }) }, { type: 'separator' }, { role: 'quit', label: 'Çıkış' }] },
      { label: 'Düzenle', submenu: [{ role: 'undo', label: 'Metin işlemini geri al' }, { role: 'redo', label: 'Metin işlemini yinele' }, { type: 'separator' }, { role: 'cut', label: 'Kes' }, { role: 'copy', label: 'Kopyala' }, { role: 'paste', label: 'Yapıştır' }, { role: 'selectAll', label: 'Tümünü seç' }] },
      { label: 'Görünüm', submenu: [{ role: 'resetZoom', label: 'Normal boyut' }, { role: 'zoomIn', label: 'Büyüt' }, { role: 'zoomOut', label: 'Küçült' }, { role: 'togglefullscreen', label: 'Tam ekran' }] }
    ]));
    const allowed = url => { try { const u = new URL(url); return u.protocol === 'voltlab:' && u.host === 'app'; } catch { return false; } };
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    mainWindow.webContents.on('will-navigate', (event, url) => { if (!allowed(url)) event.preventDefault(); });
    mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
    mainWindow.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    mainWindow.webContents.session.setPermissionCheckHandler(() => false);
    mainWindow.webContents.session.on('will-download', (_event, item) => item.setSaveDialogOptions({ title: 'ElectrivaLab dosyasını kaydet', defaultPath: path.join(app.getPath('documents'), path.basename(item.getFilename())) }));
    mainWindow.webContents.on('will-prevent-unload', event => {
      const choice = dialog.showMessageBoxSync(mainWindow, { type: 'question', buttons: ['Atölyeye dön', 'Kaydetmeden çık'], defaultId: 0, cancelId: 0, title: 'Kaydedilmemiş değişiklikler', message: 'Değişiklikleri kaydetmeden çıkmak istiyor musun?' });
      if (choice === 1) event.preventDefault();
    });
    mainWindow.once('ready-to-show', reveal);
    mainWindow.webContents.on('did-fail-load', (_e, code, description) => {
      console.error('ElectrivaLab load failed:', code, description);
      dialog.showErrorBox('ElectrivaLab açılamadı', 'Uygulama dosyaları yüklenemedi.\n' + description);
    });
    mainWindow.webContents.on('render-process-gone', (_e, details) => console.error('Renderer stopped:', details.reason));
    mainWindow.on('closed', () => { mainWindow = null; });
    await mainWindow.loadURL('voltlab://app/');
    reveal();
    console.log('ElectrivaLab desktop ready');
  }).catch(error => { dialog.showErrorBox('ElectrivaLab başlatılamadı', error.message); app.quit(); });
  app.on('window-all-closed', () => app.quit());
}
