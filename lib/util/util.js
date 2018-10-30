/*
 * @Author: horan 
 * @Date: 2017-07-09 10:23:12 
 * @Last Modified by: horan
 * @Last Modified time: 2018-10-30 14:37:55
 * @Common Method
 */

var _ = require('underscore');
var fs = require('fs');
var path = require("path");
var mongo = require('mongodb');
var Timestamp = require('mongodb').Timestamp;
var appRoot = require('app-root-path');
var filePath = path.join(appRoot.path, 'crawlerData');

var getWatchers = function (watchers, mServer, database, collectionName) {
    var watchersArr = [];
    _.find(watchers, function (watcher) {
        if (watcher.Content.mongodb.m_connection.m_servers.toString() === mServer) {
            if (watcher.Content.mongodb.m_database === database) {
                if (watcher.Content.mongodb.m_collectionname === collectionName) {
                    watchersArr.push(watcher);
                }
            }
        }
    });
    return watchersArr;
};

var returnJsonObject = function (nativeJson, searchJson) {
    var resultJson = {};
    if (nativeJson && searchJson) {
        var v = returnJsonValue(searchJson);
        if (v === 1) {
            for (var attrNa in nativeJson) {
                for (var attrFi in searchJson) {
                    if (attrNa === attrFi) {
                        resultJson[attrNa] = nativeJson[attrNa];
                    }
                }
            }
        } else if (v === 0) {
            for (var attrNa in nativeJson) {
                var flag = false;
                for (var attrFi in searchJson) {
                    if (attrNa === attrFi) {
                        flag = true;
                        continue;
                    }
                }
                if (!flag) {
                    resultJson[attrNa] = nativeJson[attrNa];
                }
            }
        } else {
            resultJson = nativeJson;
        }
    } else {
        resultJson = nativeJson;
    }
    return resultJson;
};

var returnJsonValue = function (obj) {
    var result = -1;
    if (obj && Object.keys(obj).length > 0) {
        var size = 0;
        for (key in obj) {
            if (obj[key] > -1) {
                result = obj[key];
                if (size > 0 && result !== obj[key]) {
                    result = -1;
                    return;
                }
            }
            size++;
        }
    }

    if (result !== -1 && result !== 0 && result !== 1) {
        result = -1;
    }
    return result;
};

var mergeJsonObject = function (nativeJson, expandJson) {
    var resultJson = {};
    if (nativeJson && expandJson) {
        for (var nattr in nativeJson) {
            resultJson[nattr] = nativeJson[nattr];
        }
        for (var eattr in expandJson) {
            resultJson[eattr] = expandJson[eattr];
        }
    } else {
        if (expandJson) {
            resultJson = expandJson;
        } else {
            resultJson = nativeJson;
        }
    }
    return resultJson;
};

var extendinit = function (obj, fileName) {
    var resultJson = {};
    if (obj && obj.m_comparefild && obj.m_comparefildType === "ObjectId") {
        resultJson._id = {};
        if (obj.m_startFrom) {
            var startFromTs = new Date(obj.m_startFrom).getTime() / 1000;
            if (startFromTs) {
                var startId = startFromTs.toString(16) + new Array(17).join("0");
                var startObjectId = mongo.ObjectID(startId);
                resultJson._id.$gte = startObjectId;
            }
        }
        if (obj.m_endTo) {
            var endToTs = new Date(obj.m_endTo).getTime() / 1000;
            if (endToTs) {
                var ednId = endToTs.toString(16) + new Array(17).join("0");
                var endObjectId = mongo.ObjectID(ednId);
                resultJson._id.$lte = endObjectId;
            }
        }
        if (!obj.m_startFrom || !obj.m_endTo) {
            resultJson = null;
        }
    } else if (obj && obj.m_comparefild && obj.m_comparefildType === "DateTime") {
        resultJson[obj.m_comparefild] = {};
        if (obj.m_startFrom) {
            var startFrom = new Date(obj.m_startFrom);
            if (startFrom) {
                resultJson[obj.m_comparefild].$gte = startFrom;
            }
        }
        if (obj.m_endTo) {
            var endTo = new Date(obj.m_endTo);
            if (endTo) {
                resultJson[obj.m_comparefild].$lte = endTo;
            }
        }
        if (!obj.m_startFrom && !obj.m_endTo) {
            var timestampStr = returnFileTimestampStr(fileName.split(".")[0], filePath);
            if (timestampStr !== "") {
                var timestamp = returnTimestamp(timestampStr);
                resultJson[obj.m_comparefild].$gte = new Date(timestamp.getHighBits() * 1000);
            } else {
                resultJson = null;
            }
        }
    }
    return resultJson;
}

var filterJson = function (filterJson, dataJson) {
    if (filterJson && dataJson) {
        for (var fj in filterJson) {
            for (var dj in dataJson) {
                if (fj === dj) {
                    if (filterJson[fj] !== dataJson[dj]) {
                        return false;
                    }
                }
            }
        }
    }
    return true;
};

var contains = function (arr, obj) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === obj) {
            return true;
        }
    }
    return false;
};

var readFolderList = function (filePath, folderList) {
    if (filePath !== "") {
        var files = fs.readdirSync(filePath);
        if (files && files.length > 0) {
            files.forEach(function (filename) {
                var stat = fs.statSync(path.join(filePath, filename));
                if (stat.isDirectory()) {
                    folderList.push(filename);
                }
            });
        }
    }
    return folderList;
};

var readFileList = function (filePath, filesList, extName) {
    if (filePath !== "") {
        var files = fs.readdirSync(filePath);
        if (files && files.length > 0) {
            files.forEach(function (filename) {
                var stat = fs.statSync(path.join(filePath, filename));
                if (stat.isDirectory()) {
                    readFileList(path.join(filePath, filename), filesList, extName);
                } else {
                    if (path.extname(filename) === extName) {
                        var currentFile = {};
                        var currentFileContent = require(path.join(filePath, filename));
                        currentFile.Filename = filename;
                        currentFile.Content = currentFileContent;
                        filesList.push(currentFile);
                    }
                }
            });
        }
    }
    return filesList;
};

var mkdir = function (dirpath, dirname) {
    if (typeof dirname === "undefined") {
        if (fs.existsSync(dirpath)) {
            return;
        } else {
            mkdir(dirpath, path.dirname(dirpath));
        }
    } else {
        if (dirname !== path.dirname(dirpath)) {
            mkdir(dirpath);
            return;
        }
        if (fs.existsSync(dirname)) {
            fs.mkdirSync(dirpath);
        } else {
            mkdir(dirname, path.dirname(dirpath));
            fs.mkdirSync(dirpath);
        }
    }
};

var arrayto_String = function (arr) {
    var returnString = "";
    for (var i = 0; i < arr.length; i++) {
        if ((i + 1) == arr.length) {
            returnString += arr[i].replace(":", "_");
        } else {
            returnString += arr[i].replace(":", "_") + "_";
        }
    }
    return returnString;
};

var returnMongodbDataUrl = function (url, connection, dataBase) {
    var mongodbDataUrl = "";
    if (url) {
        mongodbDataUrl = url;
    } else {
        if (connection.m_servers && connection.m_servers.length > 0) {
            if (connection.m_authentication) {
                if (connection.m_authentication.username && connection.m_authentication.password && connection.m_authentication.authsource) {
                    if (connection.m_authentication.ssl) {
                        mongodbDataUrl = "mongodb://" + connection.m_authentication.username + ":" + connection.m_authentication.password +
                            "@" + connection.m_servers.toString() + "/" + dataBase + "?ssl=" + connection.m_authentication.ssl + "&authSource=" +
                            connection.m_authentication.authsource + (connection.m_authentication.replicaset ? "&replicaSet=" + connection.m_authentication.replicaset : "");
                    } else {
                        mongodbDataUrl = "mongodb://" + connection.m_authentication.username + ":" + connection.m_authentication.password +
                            "@" + connection.m_servers.toString() + "/" + dataBase + "?authSource=" + connection.m_authentication.authsource +
                            (connection.m_authentication.replicaset ? "&replicaSet=" + connection.m_authentication.replicaset : "");
                    }
                }
            } else {
                mongodbDataUrl = "mongodb://" + connection.m_servers.toString() + "/" + dataBase;
            }
        }
    }
    return mongodbDataUrl;
};

var returnMongodbOplogUrl = function (url, connection) {
    var mongodbOplogUrl = "";
    if (url) {
        var urlArray = url.split("?");
        var length = urlArray[0].lastIndexOf('/');
        var topUrlString = urlArray[0].substr(0, length);
        if (urlArray[1]) {
            mongodbOplogUrl = topUrlString + "/local?" + urlArray[1];
        } else {
            mongodbOplogUrl = topUrlString + "/local";
        }
    } else {
        if (connection.m_servers && connection.m_servers.length > 0) {
            if (connection.m_authentication) {
                if (connection.m_authentication.username && connection.m_authentication.password && connection.m_authentication.authsource) {
                    if (connection.m_authentication.ssl) {
                        mongodbOplogUrl = "mongodb://" + connection.m_authentication.username + ":" + connection.m_authentication.password +
                            "@" + connection.m_servers.toString() + "/local" + "?ssl=" + connection.m_authentication.ssl + "&authSource=" +
                            connection.m_authentication.authsource + (connection.m_authentication.replicaset ? "&replicaSet=" + connection.m_authentication.replicaset : "");
                    } else {
                        mongodbOplogUrl = "mongodb://" + connection.m_authentication.username + ":" + connection.m_authentication.password +
                            "@" + connection.m_servers.toString() + "/local" + "?authSource=" + connection.m_authentication.authsource +
                            (connection.m_authentication.replicaset ? "&replicaSet=" + connection.m_authentication.replicaset : "");
                    }
                }
            } else {
                mongodbOplogUrl = "mongodb://" + connection.m_servers.toString() + "/local";
            }
        }
    }
    return mongodbOplogUrl;
};

var createInfoArray = function (fileList) {
    global.infoArray = [];
    _.find(fileList, function (file) {
        var item = {};
        item.cluster = file.Content.elasticsearch.e_connection.e_server;
        item.index = file.Content.elasticsearch.e_index;
        item.msg = "";
        item.status = "w";
        global.infoArray.push(item);
    });
};

var updateInfoArray = function (cluster, index, msg, status) {
    if (global.infoArray && global.infoArray.length > 0) {
        _.find(global.infoArray, function (file) {
            if (file.cluster === cluster && file.index === index) {
                file.msg = msg;
                file.status = status;
            }
        });
    } else {
        global.infoArray = [];
        var item = {};
        item.cluster = cluster;
        item.index = index;
        item.msg = msg;
        item.status = status;
        global.infoArray.push(item);
    }
};

var returnTimestampStr = function (timestamp) {
    var timestampStr = "";
    if (timestamp) {
        timestampStr = timestamp.toString();
    } else {
        timestampStr = Timestamp(1, new Date().getTime() / 1000).toString();
    }
    return timestampStr;
};

var returnFileTimestampStr = function (fileName, filePath) {
    var timestampStr = "";
    var name = fileName + ".timestamp";
    if (fs.existsSync(path.join(filePath, name))) {
        var item = JSON.parse(fs.readFileSync(path.join(filePath, name)));
        if (item) {
            timestampStr = item.timestamp;
        }
    }
    return timestampStr;
};

var returnTimestamp = function (timestampStr) {
    return Timestamp.fromString(timestampStr);
};

var updateTimestampFile = function (timestampStr, fileName, filePath) {
    var file = path.join(filePath, fileName + '.timestamp');
    var data = {
        "timestamp": timestampStr
    };
    fs.writeFileSync(file, JSON.stringify(data));
};

var returnBulkList = function (oplogList, configFile) {
    var bulkList = [];
    oplogList.forEach(function (item) {
        if (item && item.op && item.o) {
            var id = "";
            if (doc.o && doc.o._id) {
                id = doc.o._id.toString();
            } else {
                if (doc.o2 && doc.o2._id) {
                    id = doc.o2._id.toString();
                }
            }
            switch (item.op) {
                case "i":
                    bulkList.push({
                        create: {
                            _index: configFile.Content.elasticsearch.e_index,
                            _type: configFile.Content.elasticsearch.e_type,
                            _id: id
                        }
                    }, returnJsonObject(item.o, configFile.Content.mongodb.m_returnfilds));
                    break;
                case "u":
                    var doc = {};
                    doc.doc = {};
                    if (obj.$set) {
                        doc.doc = Util.returnJsonObject(item.o.$set, watcher.Content.mongodb.m_returnfilds);
                    } else {
                        doc.doc = Util.returnJsonObject(item.o, watcher.Content.mongodb.m_returnfilds);
                    }
                    bulkList.push({
                        update: {
                            _index: configFile.Content.elasticsearch.e_index,
                            _type: configFile.Content.elasticsearch.e_type,
                            _id: id
                        }
                    }, doc);
                    break;
                case "d":
                    bulkList.push({
                        delete: {
                            _index: index,
                            _type: type,
                            _id: id
                        }
                    });
                    break;
            }
        }
    });
    return bulkList;
};

module.exports = {
    getWatchers: getWatchers,
    returnJsonObject: returnJsonObject,
    mergeJsonObject: mergeJsonObject,
    extendinit: extendinit,
    filterJson: filterJson,
    contains: contains,
    readFolderList: readFolderList,
    readFileList: readFileList,
    mkdir: mkdir,
    arrayto_String: arrayto_String,
    returnMongodbDataUrl: returnMongodbDataUrl,
    returnMongodbOplogUrl: returnMongodbOplogUrl,
    createInfoArray: createInfoArray,
    updateInfoArray: updateInfoArray,
    returnTimestampStr: returnTimestampStr,
    returnFileTimestampStr: returnFileTimestampStr,
    returnTimestamp: returnTimestamp,
    updateTimestampFile: updateTimestampFile,
    returnBulkList: returnBulkList
};