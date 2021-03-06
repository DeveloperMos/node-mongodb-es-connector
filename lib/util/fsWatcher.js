/*
 * @Author: horan 
 * @Date: 2017-07-09 09:44:35 
 * @Last Modified by: horan
 * @Last Modified time: 2019-09-29 14:11:29
 * @Creates and manages the fsWatcher
 */

var chokidar = require('chokidar');
var path = require("path");
var fs = require('fs');
var logger = require('./logger.js');
var main = require('../main');
var watcher = null
var ready = false

var fsWatcher = function (filePath) {
    function addFileListener(path_) {
        if (ready) {
            logger.logMethod('info',
                '',
                '',
                '******************************Add config file******************************');
            logger.logMethod('info',
                '',
                '',
                'File added: ' + path_.split("\\")[1]);
            var currentFile = {};
            currentFile.Filename = path_.split("\\")[1];
            currentFile.Content = JSON.parse(fs.readFileSync(path.join(filePath, path_.split("\\")[1])));
            main.singlePipe(currentFile, filePath);
        }
    }

    function fileChangeListener(path_) {
        logger.logMethod('info',
            '',
            '',
            '******************************update config file******************************');
        logger.logMethod('info',
            '',
            '',
            'File changed: ' + path_.split("\\")[1]);
        var currentFile = {};
        currentFile.Filename = path_.split("\\")[1];
        currentFile.Content = JSON.parse(fs.readFileSync(path.join(filePath, path_.split("\\")[1])));
        main.singlePipe(currentFile, filePath);
    }

    function fileRemovedListener(path_) {
        logger.logMethod('info',
            '',
            '',
            '******************************Delete config file******************************');
        logger.logMethod('info',
            '',
            '',
            'File deleted: ' + path_.split("\\")[1]);
    }

    if (!watcher) {
        watcher = chokidar.watch(`${filePath}/**/*.json`, {
            persistent: true,
            ignored: `/(^|[\/\\])\../`,
            cwd: '.',
            depth: 0
        })
    }

    watcher
        .on('add', addFileListener)
        .on('change', fileChangeListener)
        .on('unlink', fileRemovedListener)
        .on('error', function (err) {
            logger.logMethod('error',
                '',
                '',
                'fsWatcher error: ' + JSON.stringify(err).substring(0,200));
        })
        .on('ready', function () {
            logger.logMethod('debug',
                '',
                '',
                'FsWatcher is running');
            ready = true
        })

};

module.exports = {
    fsWatcher: fsWatcher
};