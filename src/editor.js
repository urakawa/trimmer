"use strict";
const {remote} = require('electron');
const {dialog} = remote;
const {BrowserWindow} = remote;
const {ipcRenderer} = require('electron');

const fs = require('fs');

var inputArea = null;
var inputTxt = null;
var footerArea = null;

var currentPath = "";
var editor = null;

/**
 * Webページ読み込み時の処理
 */
function onLoad() {
    // 入力関連領域
    inputArea = document.getElementById("input_area");
    // 入力領域
    inputTxt = document.getElementById("input_txt");
    // フッター領域
    footerArea = document.getElementById("footer_fixed");

    editor = ace.edit("input_txt");
    editor.getSession().setMode("ace/mode/json");
    editor.setTheme("ace/theme/twilight");

    // ドラッグ&ドロップ関連処理
    // documentにドラッグされた場合 / ドロップされた場合
    document.ondragover = document.ondrop = function (e) {
        e.preventDefault(); // イベントの伝搬を止めて、アプリケーションのHTMLとファイルが差し替わらないようにする
        return false;
    };

    inputArea.ondragover = function () {
        return false;
    };
    inputArea.ondragleave = inputArea.ondragend = function () {
        return false;
    };
    inputArea.ondrop = function (e) {
        e.preventDefault();
        var file = e.dataTransfer.files[0];
        readFile(file.path);
        return false;
    };


};

/**
 * テンプレートファイルを開き、レンダリングし、それを別名で保存する
 */
function renderMustache() {
    var win = BrowserWindow.getFocusedWindow();

    dialog.showOpenDialog(
        win,
        // どんなダイアログを出すかを指定するプロパティ
        {
            properties: ['openFile'],
            filters: [
                {
                    name: 'Documents',
                    extensions: ['html', 'mustache']
                }
            ]
        },
        // [ファイル選択]ダイアログが閉じられた後のコールバック関数
        function (filenames) {
            if (filenames) {
                // mustacheレンダリング結果
                // mainプロセスからのメッセージ取得
                // 成功/失敗をダイアログで出力
                ipcRenderer.on('mustache-render', (event, arg) => {
                    if (arg === true) {
                        dialog.showMessageBox(
                            win,
                            // どんなダイアログを出すかを指定するプロパティ
                            {
                                type: "info",
                                message: "変換完了",
                                buttons: ["OK"]
                            }
                        );
                    } else {
                        dialog.showMessageBox(
                            win,
                            // どんなダイアログを出すかを指定するプロパティ
                            {
                                type: "error",
                                message: "変換失敗",
                                buttons: ["OK"]
                            }
                        );
                    }
                    ipcRenderer.off('mustache-render');
                });
                ipcRenderer.on('filepath-reply', (event, arg) => {
                    console.log(arg); // prints "pong"
                    ipcRenderer.off('filepath-reply');
                });
                ipcRenderer.on('json-reply', (event, arg) => {
                    console.log(arg); // prints "pong"
                    ipcRenderer.off('json-reply');
                });


                // 非同期でテンプレートファイル名を送る
                ipcRenderer.send('filepath-message', filenames[0]);
                // 非同期でjsonファイル名を送る
                ipcRenderer.send('json-message', editor.getValue());
            }
        });
}

/**
 * テキストを読み込み、テキストを入力エリアに設定する
 */
function readFile(path) {
    currentPath = path;
    fs.readFile(path, function (error, text) {
        if (error != null) {
            alert('error : ' + error);
            return;
        }
        // フッター部分に読み込み先のパスを設定する
        footerArea.innerHTML = path;
        // テキスト入力エリアに設定する
        editor.setValue(text.toString(), -1);
    });
}

/**
 * jsonファイルを開く
 */
function openLoadFile() {
    var win = BrowserWindow.getFocusedWindow();

    dialog.showOpenDialog(
        win,
        // どんなダイアログを出すかを指定するプロパティ
        {
            properties: ['openFile'],
            filters: [
                {
                    name: 'Documents',
                    extensions: ['json']
                }
            ]
        },
        // [ファイル選択]ダイアログが閉じられた後のコールバック関数
        function (filenames) {
            if (filenames) {
                readFile(filenames[0]);
            }
        }
    );
}

/**
 * ファイルを保存する
 */
function saveFile() {
    //　初期の入力エリアに設定されたテキストを保存しようとしたときは新規ファイルを作成する
    if (currentPath == "") {
        saveNewFile();
        return;
    }

    var win = BrowserWindow.getFocusedWindow();

    dialog.showMessageBox(win, {
            title: 'ファイルの上書き保存を行います。',
            type: 'info',
            buttons: ['OK', 'Cancel'],
            detail: '本当に保存しますか？'
        },
        // メッセージボックスが閉じられた後のコールバック関数
        function (respnse) {
            // OKボタン(ボタン配列の0番目がOK)
            if (respnse == 0) {
                var data = editor.getValue();
                writeFile(currentPath, data);
            }
        }
    );
}

/**
 * ファイルを書き込む
 */
function writeFile(path, data) {
    fs.writeFile(path, data, function (error) {
        if (error != null) {
            alert('error : ' + error);
            return;
        }
    });
}

/**
 * 新規ファイルを保存する
 */
function saveNewFile() {
    var win = BrowserWindow.getFocusedWindow();
    dialog.showSaveDialog(
        win,
        // どんなダイアログを出すかを指定するプロパティ
        {
            properties: ['openFile'],
            filters: [
                {
                    name: 'Documents',
                    extensions: ['json']
                }
            ]
        },
        // セーブ用ダイアログが閉じられた後のコールバック関数
        function (fileName) {
            if (fileName) {
                var data = editor.getValue();
                currentPath = fileName;
                writeFile(currentPath, data);
            }
        }
    );
}
