/*
 *
 * RECIPE FUNCTION LIBRARY
 *
 *
 */
exports.scripty = require('azure-scripty');
exports.async = require('async');
exports.fs = require('fs');
exports.path = require('path');
exports.exec = require('child_process').exec;

// regex constant for user input
exports.REGEXP = /^[a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/;
exports.REGYN = /^(y|n|yes|no)$/i;

// cli functions & logging
exports.cli;
var log;
exports.setCli = function (cli) {
    exports.cli = cli;
    log = exports.cli.output;
}

// Prompt users to enter information
exports.ask = function (msg, format, callback) {
    if ((arguments.length === 2) && (Object.prototype.toString.call(format) === "[object Function]")) {
        callback = format;
        format = exports.REGEXP;
    }
    exports.cli.prompt(msg, function (input) {
        if (format.test(input)) {
            callback(input);
        } else {
            log.warn('Unable to recognize input format');
            exports.ask(msg, format, callback);
        }
    });
}

// Check user input/promt if error or undefined
exports.validate = function (msg, current, format, callback) {
    if (current && format.test(current))
        callback(current);
    else {
        if (current){
            log.warn('Unable to recognize input format');
        }
        exports.ask(msg, format, callback);
    }
}

// Create table and performs error handling on existing tablename
// createTable(string, string, json object with )
exports.createTable = function (myMobileservice, tablename, permission, callback) {
    var usertablename = tablename,
        progress; 

    if ((arguments.length === 3) && (Object.prototype.toString.call(permission) === "[object Function]")) {
        callback = permission;
        permission = {
            tableInsert:'application',
            tableUpdate:'application',
            tableDelete:'application',
            tableRead:'application'
        };
    }

    permission = '--permissions insert=' + permission.tableInsert + ',update=' + permission.tableUpdate 
                + ',delete=' + permission.tableDelete + ',read=' + permission.tableRead;

    log.info('');
    progress = exports.cli.progress('Checking availability for table name \'' + tablename + '\'');
    exports.scripty.invoke('mobile table show ' + myMobileservice + ' ' + tablename, function (err, results) {
        // table exists
        progress.end();
        if (results.columns.length !== 0) {
            exports.ask("Table '" + tablename + "' exists. Overwrite?(Y/N): ", exports.REGYN, function (choice) {
                if (choice.toLowerCase() === 'n' || choice.toLowerCase() === 'no') {
                    exports.ask("New " + tablename + " name: ", exports.REGEXP, function (name) {
                        usertablename = name;
                        progress = exports.cli.progress('Creating new table \'' + usertablename + '\'');
                        // create choice table
                        exports.scripty.invoke('mobile table create ' + myMobileservice + ' ' + usertablename + ' ' + permission, function (err, results) {
                            if (err) throw err;
                            else {
                                progress.end();
                                callback(err, usertablename);
                            }
                        });
                    });
                } else if (choice.toLowerCase() === 'y' || choice.toLowerCase() === 'yes') {
                    log.info("Existing table '" + tablename + "' will be used for this module.");
                    progress = exports.cli.progress('Updating table permissions');
                    exports.scripty.invoke('mobile table update ' + myMobileservice + ' ' + usertablename + ' ' + permission, function (err, results) {
                        if (err) throw err;
                        progress.end();
                        callback(err, usertablename);
                    })
                } else throw new Error('Invalid input');
            });
        } else {
            progress = exports.cli.progress('Creating new table \'' + usertablename + '\'');
            exports.scripty.invoke('mobile table create ' + myMobileservice + ' ' + usertablename + ' ' + permission, function (err, results) {
                if (err) throw err;
                else {
                    progress.end();
                    callback(err, usertablename);
                }
            });
        }
    });
}


// copy given file from core module to user environment & customize
exports.copyRecipeFile = function (dir, file, newDir, newFile, original, replacement, callback) {

    if (original && replacement) {
        if ((original.length != replacement.length) || (!Array.isArray(original)) || (!Array.isArray(replacement))) {
            throw new Error("Customization arguments does not satisfy the requirements.");
        }
    }

    // script location
    var script = exports.path.join(__dirname, dir, file);

    newDir = newDir || dir;
    newFile = newFile || file;

    // user location
    var curdir = process.cwd();
    var filedir = exports.path.join(curdir, newDir);
    var myScript = exports.path.join(filedir, newFile);

    exports.async.series([
        function (callback) {
            // create client directory for file
            exports.makeDir(filedir, function (err) {
                if (err) return callback(err);
                callback();
            });
        },
        function (callback) {
            if (original && replacement) {
                // read in module file
                exports.fs.readFile(script, 'utf8', function (err, data) {
                    if (err) return callback(err);
                    // update scripts with customizable information
                    var result = data;
                    for (var i = 0; i < replacement.length; i++) {
                        var pattern = new RegExp(original[i], 'g');
                        result = result.replace(pattern, replacement[i]);
                    }
                    // write to user environment
                    exports.fs.writeFile(myScript, result, 'utf8', function (err) {
                        if (err) return callback(err);
                        callback();
                    });
                });
            }
            else {
                // read in module file
                exports.fs.readFile(script, function (err, data) {
                    if (err) return callback(err);
                    exports.fs.writeFile(myScript, data, function (err) {
                        if (err) return callback(err);
                        callback();
                    });
                });
            }
        }],
        function(err, results) {
            if (err) throw err;
            callback();
        });
}

// copy given file from module to user environment & customize
var copyFile = function (recipename, dir, file, newDir, newFile, original, replacement, callback) {
    var fileDir = exports.path.join('..', recipename, dir);
    newDir = newDir || dir;
    exports.copyRecipeFile(fileDir, file, newDir, newFile, original, replacement,
        function (err) {
            if (err) callback(err);
            callback();
        });
}

// copy files from recipename in a files object to user environment
exports.copyFiles = function (recipename, files, callback, display) {
    // copy all client files and create directories
    exports.async.forEachSeries(
        files,
        function (file, done) {
            copyFile('azuremobile-' + recipename, file.dir.replace(__dirname, ''), file.file, file.newDir, file.newFile, file.original, file.replacement,
                function (err) {
                    if (err) callback(err);
                    done();
                });
        },
        function (err) {
            if (err) callback(err);
            if (display !== false){
                log.info('');
                log.table(files, function(row, s) {
                    row.cell('Files copied', exports.path.join(s.dir.replace(__dirname, ''), s.file));
                });
                log.info('');
            }
            callback();
        });
}

// recursively create directories for given path
exports.makeDir = function (path, mode, callback) {

    if ((arguments.length === 2) && (Object.prototype.toString.call(mode) === "[object Function]")) {
        callback = mode;
        mode = 0777;
    }
    mode = mode || 0777;

    // format into array and exclude files
    parts = exports.path.normalize(path).split(/[\\\/]/);
    if (parts[parts.length - 1].indexOf('.') !== -1) {
        parts.pop();
    }

    exports.async.forEachSeries(
        parts,
        function (file, done) {
            file = parts.slice(0, parts.indexOf(file) + 1).join('/');

            exports.fs.stat(file, function (err, stat) {
                if ((!err) && (stat) && (stat.isDirectory()))
                    done();
                else {
                    exports.fs.mkdir(file, mode, function (err) {
                        if (err) {
                            if (callback) return callback(err);
                            else throw err;
                        } else done();
                    });
                }
            });
        },
        function (err) {
            if (err) {
                if (callback) return callback(err);
                else throw err;
            }
            if (callback) callback();
            else return;
        });
}


// extract directory and file separately 
exports.splitPath = function (path) {
    var pathDir = path;
    var pathFile = '';
    var parts = exports.path.normalize(path).split(/[\\\/]/);

    if (parts[parts.length - 1].indexOf('.') !== -1) {
        pathDir = parts.slice(0, parts.length - 1).join('/');
        pathFile = parts[parts.length - 1];
    }

    return {
        dir: pathDir,
        file: pathFile
    };
};

// recursively return all files in a directory
exports.readPath = function (path, origin, callback) {
    var results = [];

    exports.fs.readdir(path, function (err, files) {
        if (err) return callback(err);

        exports.async.forEachSeries(
            files,
            function (file, done) {
                file = exports.path.join(path, file);

                exports.fs.stat(file, function (err, stat) {
                    if (stat && stat.isDirectory()) {
                        exports.readPath(file, origin, function (err, subresults) {
                            results = results.concat(subresults);
                            done();
                        })
                    } else {
                        results.push(exports.splitPath(file.replace(origin, '')));
                        done();
                    }
                });
            },
            function (err) {
                if (err) callback(err);
                callback(null, results);
            });
    })
}