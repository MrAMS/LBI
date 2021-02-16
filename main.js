const { app, BrowserWindow } = require('electron');

const {ipcMain, dialog} = require('electron');

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const m_exts = require('./m_exts');
const m_data = require('./m_data');
const m_api = require('./m_api');
const m_login = require('./m_login')
const { event } = require('jquery');

var win_main;
var win_login;

ipcMain.on('load-page', (event, arg) => {
  win_main.loadFile(arg);
})

ipcMain.on('open-file-dialog', (event) => {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
      if(!result.canceled)
        m_exts.scan_folder(result.filePaths[0], res => {event.sender.send('scan-folder', result.filePaths[0], res);});
    }).catch(err => {
      console.log(err)
    })
})

ipcMain.on('guide-settings', (event, folders, api) => {
  for(let i=0;i<folders.length;++i)
    m_data.add_folder(folders[i]);
  m_data.set('settings.api', api);
});

ipcMain.on('scapper-cancel', (event, sender) => {
  if(sender == 'app'){
    win_main.loadFile('app.html');
  }else{
    m_data.clear_database()
    win_main.loadFile('guide.html');
  }
})

ipcMain.on('start-scapper', (event, bgms, sender) => {
  win_main.loadFile('scapper.html').then(() => {
    win_main.webContents.send('scapper-load', bgms, sender);
  });
  for(let i=0;i<bgms.length;++i){
    setTimeout(function(){
      m_exts.get_bgm_info(bgms[i].name, (success, res) => {
        if(!success) win_main.webContents.send('scapper-updata', false, [bgms[i].name, 'ERRO:' + res]);
        else win_main.webContents.send('scapper-updata', true, m_exts.install_bgm(bgms[i].name, bgms[i].path, res));
      });
    }, 2000*i);
  }
})

ipcMain.on('scapper-reinstall-bgm', (event, bgm, subject_id) => {
  m_exts.get_bgm_info(bgm.name, (success, res) => {
    if(!success) event.sender.send('scapper-updata', false, [bgm.name, 'ERRO:' + res]);
    else event.sender.send('scapper-updata', true, m_exts.install_bgm(bgm.name, bgm.path, res));
  }, subject_id);
})

ipcMain.on('scapper-finished', (event) => {
  win_main.loadFile('app.html');
});

ipcMain.on('m-log', (event, info) => {
  win_main.webContents.send('app-log', info);
})

ipcMain.on('login-bgm', (event) => {
  win_login = new BrowserWindow({ width: 800, height: 600 })
  win_login.loadURL('http://bgm.tv/oauth/authorize?client_id=bgm17616023b2473bf0e&response_type=code&redirect_uri=http://localhost:6008/');
})

function login_success(){
  win_login.close();
  m_login.get_user_info(m_data.get_user_access_token(), (success, user_info) => {
    if(success){
      win_main.webContents.send('app-log', "登录成功");
      win_main.webContents.send('user-info-updata', user_info);
    }else{
      win_main.webContents.send('app-log', user_info);
    }
  })
}

function createWindow () {
  win_main = new BrowserWindow({
  width: 900,
  height: 600,
  webPreferences: {
      nodeIntegration: true
  }
  });
  if(m_data.check_database()) win_main.loadFile('app.html');
  else win_main.loadFile('guide.html');
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
})

app.whenReady().then(run)

function load_login(){
  m_login.start_listen((success, res) => {
    if(success){
      m_data.set_user_access_token(res);
      login_success();
    }
  });
  if(m_data.get_user_access_token() != undefined)
    m_login.login_refresh(m_data.get_user_access_token().refresh_token, (res) => {
      if(res != undefined && res.error == undefined){
        m_data.set_user_access_token(res);
        m_login.get_user_info(m_data.get_user_access_token(), (success, res) => {
          if(success){
            win_main.webContents.send('user-info-updata', res);
          }else{
            win_main.webContents.send('app-log', res);
          }
        });
      }else{
        win_main.webContents.send('app-log', "Refresh Token 失败，请重新登录");
        m_data.remove_user_access_token();
      }
    })
}

function run(){
  m_exts.check_data_path(__dirname);
  load_login();
  createWindow();
}