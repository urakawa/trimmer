"use strict";
const electron = require('electron');
const {app} = electron;
const {BrowserWindow} = electron;
const {ipcMain} = electron;

const fs = require('fs');

const Mustache = require('mustache');

let win;

var templatePath;
var jsonValue;

function createWindow() {
    win = new BrowserWindow({"width": 800, "height": 600, "nodeIntegration": true});
    win.loadURL(`file://${__dirname}/index.html`);
    win.on('closed', () => { win = null; });
}

function renderMustache(path, jsonValue) {
    // pathのファイルを読み込む

    let template = fs.readFileSync(path, 'utf-8');
    var html = Mustache.render(template, jsonValue);

    return html;
}

function saveRendered(path, html) {
    fs.writeFile(path, html, function (error) {
        if (error != null) {
            console.log('error : ' + error);
            return html;
        }
    });
}


// app の各種イベント
app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (win === null) createWindow();
});


// ipcMain の各種イベント
// 同期でレンダラープロセスからのメッセージを受信し、メッセージを返信する
ipcMain.on('filepath-message', function (event, arg) {
    console.log("filepath-message arg : " + arg);
    event.sender.send('filepath-reply', 'filepath-message main process.');

    templatePath = arg;
    if (jsonValue) {
        let renderingJsonValue = jsonValue;
        let renderingTemplatePath = templatePath;
        // リセット
        templatePath = undefined;
        jsonValue = undefined;

        try {
            let html = renderMustache(renderingTemplatePath, renderingJsonValue);

            let renderedFilePath = renderingTemplatePath + ".rendered.html";
            saveRendered(renderedFilePath, html);
        } catch(ex) {
            console.log(ex);
            event.sender.send('mustache-render', false);
            return;
        }

        // イベント送信
        event.sender.send('mustache-render', true);
    }
});

ipcMain.on('json-message', function (event, arg) {
    event.sender.send('json-reply', 'json-message main process.');
    jsonValue = JSON.parse(arg, 'UTF-8');
    if (templatePath) {
        let renderingJsonValue = jsonValue;
        let renderingTemplatePath = templatePath;
        // リセット
        templatePath = undefined;
        jsonValue = undefined;

        try {
            let html = renderMustache(renderingTemplatePath, renderingJsonValue);

            let renderedFilePath = renderingTemplatePath + ".rendered.html";
            saveRendered(renderedFilePath, html);
        } catch(ex) {
            console.log(ex);
            event.sender.send('mustache-render', false);
            return;
        }

        // イベント送信
        event.sender.send('mustache-render', true);
    }
});
