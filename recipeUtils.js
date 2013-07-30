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
// Referece: http://st-on-it.blogspot.com/2011/05/how-to-read-user-input-with-nodejs.html
exports.ask = function (question, format, callback) {
    var stdin = process.stdin;
    var stdout = process.stdout;

    if ((arguments.length === 2) && (Object.prototype.toString.call(format) === "[object Function]")) {
        callback = format;
        format = exports.REGEXP;
    }

    stdin.resume();
    stdout.write(question + ": ");

    stdin.once('data', function (data) {
        data = data.toString().trim();

        if (format.test(data)) {
            callback(data);
        } else {
            stdout.write("Input format does not match \n");
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
    if (permission.length === 1){
        permission = ' --permissions insert='+ permission[0] +',update='+ permission[0]+',delete='+ permission[0]+',read='+ permission[0];
    }
    else if (permission.length === 4){
        permission = ' --permissions insert='+ permission[0] +',update='+ permission[1]+',delete='+ permission[2]+',read='+ permission[3];
    }
    else {
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
                } 
                else if (choice.toLowerCase() === 'y' || choice.toLowerCase() === 'yes') {
                    console.log("Existing table '" + tablename + "' will be used for this module.\n");
                    callback(err, usertablename);
                }
                else throw new Error('Invalid input');
            });
        } 
        else {
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
// input: recipe_name, [folder, new_folder], [file_name, new_file_name], original, replacement, callback
exports.copyRecipeFile = function (folder, file_name, original, replacement, callback) {

    if ((original.length != replacement.length) || (!Array.isArray(original)) || (!Array.isArray(replacement))) {
        throw new Error("Customization arguments does not satisfy the requirements.");
    }

    // script location
    var script = __dirname + '/' + folder[0] + '/' + file_name[0];

    // user location
    var curdir = process.cwd();
    var filedir = curdir + '/' + folder[folder.length - 1];
    var myScript = filedir + "/" + file_name[file_name.length - 1];

    exports.async.series([
        function (callback) {
            // create client directory for file
            exports.mkdir_p(filedir, function (err) {
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
                        callback(err);

                    console.log(exports.path.join(folder[folder.length - 1], file_name[file_name.length - 1]) + ' is copied.');
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
exports.copyFile = function (recipename, folder, file_name, original, replacement, callback) {
    recipefile = exports.path.join('..',recipename,folder[0]);
    if (folder.length === 2) {
        exports.copyRecipeFile([recipefile, folder[1]], file_name, original, replacement,
            function (err) {
                callback(err);
            });
    } else if (folder.length === 1) {
        exports.copyRecipeFile([recipefile, folder[0]], file_name, original, replacement,
            function (err) {
                callback(err);
            });
    } else
        throw new Error('Customization arguments does not satisfy the requirements.');

}

// recursively create directories for given path
// reference https://gist.github.com/bpedro/742162
exports.mkdir_p = function (path, callback, mode, position) {
    mode = mode || 0777;
    position = position || 0;
    parts = exports.path.normalize(path).split(/[\\\/]/);

    // exclude files
    if (parts[parts.length - 1].indexOf('.') !== -1) {
        parts.pop();
    }

    if (position >= parts.length) {
        if (callback) {
            return callback();
        } else {
            return true;
        }
    }

    var directory = parts.slice(0, position + 1).join('/');

    exports.fs.stat(directory, function (err) {
        if (err === null) {
            exports.mkdir_p(path, callback, mode, position + 1);
        } else {
            exports.fs.mkdir(directory, mode, function (err) {
                if (err) {
                    if (callback) {
                        return callback(err);
                    } else {
                        throw err;
                    }
                } else {
                    exports.mkdir_p(path, callback, mode, position + 1);
                }
            });
        }
    });
}

// extract directory and file separately 
// referece: http://stackoverflow.com/questions/2187256/js-most-optimized-way-to-remove-a-filename-from-a-path-in-a-string
exports.splitPath = function (path) {
    var dirPart, filePart;
    path.replace(/^(.*\/)?([^/]*)$/, function (_, dir, file) {
        dirPart = dir;
        filePart = file;
    });
    return {
        dir: dirPart,
        file: filePart
    };
};

// recursively return all files in a directory
// reference: http://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
exports.readPath = function (dir, done) {
    var results = [];
    exports.fs.readdir(dir, function (err, list) {
        if (err)
            return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = dir + '/' + file;

            exports.fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    exports.readPath(file, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(exports.splitPath(file));
                    next();
                }
            });

        })();
    });
};