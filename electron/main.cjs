const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        fullscreen: true,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '../public/icon.png') // Attempt to set window icon
    });

    if (!app.isPackaged) {
        win.loadURL('http://localhost:4000');
        win.webContents.openDevTools();
    } else {
        // Next.js exports to 'out' folder
        win.loadFile(path.join(__dirname, '../out/index.html'));
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
