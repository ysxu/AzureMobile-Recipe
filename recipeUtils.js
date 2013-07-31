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

// Prompt users to enter information
exports.ask = function (question, format, callback) {

    if ((arguments.length === 2) && (Object.prototype.toString.call(format) === "[object Function]")) {
        callback = format;
        format = exports.REGEXP;
    }

    var stdin = process.stdin;
    var stdout = process.stdout;

    stdin.resume();
    stdout.write(question + ": ");

    stdin.once('data', function (data) {
        data = data.toString().trim();
        if (format.test(data)) {
            callback(data);
        } else {
            stdout.write("Input format does not match\n");
            exports.ask(question, format, callback);
        }
    });
}

// Create table and performs error handling on existing tablename
exports.createTable = function (myMobileservice, tablename, permission, callback) {
    var usertablename = tablename;

    if ((arguments.length === 3) && (Object.prototype.toString.call(permission) === "[object Function]")) {
        callback = permission;
        permission = ['application'];
    }

    // permissions
    if (permission.length === 1) {
        permission = ' --permissions insert=' + permission[0] + ',update=' + permission[0] + ',delete=' + permission[0] + ',read=' + permission[0];
    } else if (permission.length === 4) {
        permission = ' --permissions insert=' + permission[0] + ',update=' + permission[1] + ',delete=' + permission[2] + ',read=' + permission[3];
    } else {
        throw new Error('invalid permission');
    }

    exports.scripty.invoke('mobile table show ' + myMobileservice + ' ' + tablename, function (err, results) {
        // table exists
        if (results.columns != "" || results.scripts != "") {
            exports.ask("Table '" + tablename + "' exists. Would you like to overwrite?(Y/N)", exports.REGYN, function (choice) {
                if (choice.toLowerCase() === 'n' || choice.toLowerCase() === 'no') {
                    exports.ask("New " + tablename + " name", exports.REGEXP, function (name) {
                        usertablename = name;
                        console.log("New " + tablename + " table '" + usertablename + "' is being created...");
                        // create choice table
                        exports.scripty.invoke('mobile table create ' + myMobileservice + ' ' + usertablename + permission, function (err, results) {
                            if (err) throw err;
                            else {
                                console.log("Table '" + usertablename + "' successfully created.\n");
                                callback(err, usertablename);
                            }
                        });

                    });
                } else if (choice.toLowerCase() === 'y' || choice.toLowerCase() === 'yes') {
                    console.log("Existing table '" + tablename + "' will be used for this module.\n");
                    callback(err, usertablename);
                } else throw new Error('Invalid input');
            });
        } else {
            console.log("New " + tablename + " table '" + usertablename + "' is being created...");
            exports.scripty.invoke('mobile table create ' + myMobileservice + ' ' + usertablename + permission, function (err, results) {
                if (err) throw err;
                else {
                    console.log("Table '" + usertablename + "' successfully created.\n");
                    callback(err, usertablename);
                }
            });
        }
    });
}


// copy given file from core module to user environment & customize
exports.copyRecipeFile = function (folder, filename, new_folder, new_filename, original, replacement, callback) {

    if ((original.length != replacement.length) || (!Array.isArray(original)) || (!Array.isArray(replacement))) {
        throw new Error("Customization arguments does not satisfy the requirements.");
    }

    // script location
    var script = exports.path.join(__dirname, folder, filename);

    new_folder = new_folder || folder;
    new_filename = new_filename || filename;

    // user location
    var curdir = process.cwd();
    var filedir = exports.path.join(curdir, new_folder);
    var myScript = exports.path.join(filedir, new_filename);

    exports.async.series([
        function (callback) {
            // create client directory for file
            exports.makeDir(filedir, function (err) {
                if (err)
                    callback(err);
                callback(err);
            });
        },
        function (callback) {
            // read in module file
            exports.fs.readFile(script, 'utf8', function (err, data) {
                if (err)
                    callback(err);
                // update scripts with customizable information
                var result = data;
                for (var i = 0; i < replacement.length; i++) {
                    var pattern = new RegExp(original[i], 'g');
                    result = result.replace(pattern, replacement[i]);
                }

                // write to user environment
                exports.fs.writeFile(myScript, result, 'utf8', function (err) {
                    if (err)
                        callback();

                    console.log(exports.path.join(new_folder, new_filename) + ' is copied.');
                    callback(err);
                });
            });
        },
        function () {
            callback();
        }
    ]);

}

// copy given file from module to user environment & customize
var copyFile = function (recipename, folder, filename, new_folder, new_filename, original, replacement, callback) {
    var filefolder = exports.path.join('..', recipename, folder);
    new_folder = new_folder || folder;
    exports.copyRecipeFile(filefolder, filename, new_folder, new_filename, original, replacement,
        function (err) {
            if (err) callback(err);
            callback(err);
        });
}

// copy files from recipename in a files object to user environment
exports.copyFiles = function (recipename, files, callback) {
    // copy all client files and create directories
    exports.async.forEachSeries(
        files,
        function (file, done) {
            copyFile('azuremobile-' + recipename, file.dir.replace(__dirname, ''), file.file, file.new_dir, file.new_file, file.original, file.replacement,
                function (err) {
                    if (err) callback(err);
                    done();
                });
        },
        function (err) {
            if (err) callback(err);
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