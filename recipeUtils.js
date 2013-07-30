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
        } 
        else {
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
                        callback();

                    console.log(exports.path.join(new_folder,new_filename) + ' is copied.');
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
            copyFile('azuremobile-'+ recipename, file.dir.replace(__dirname,''), file.file, file.new_dir, file.new_file, file.original, file.replacement,
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
// reference https://gist.github.com/bpedro/742162
exports.mkdir_p = function (path, callback, mode, position) {

    mode = mode || 0777;
    position = position || 0;

    // format into array and exclude files
    parts = exports.path.normalize(path).split(/[\\\/]/);
    if (parts[parts.length - 1].indexOf('.') !== -1) {
        parts.pop();
    }

    // end of recursive directory creation
    if (position >= parts.length) {
        if (callback) return callback();
        else return;
    }

    var directory = parts.slice(0, position + 1).join('/');
    exports.fs.stat(directory, function (err, stat) {
        if (err === null && stat.isDirectory()) {
            // continue
            exports.mkdir_p(path, callback, mode, position + 1);
        } else {
            // create directory
            exports.fs.mkdir(directory, mode, function (err) {
                if (err) {
                    if (callback) return callback(err);
                    else throw err;
                } 
                else {
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
exports.readPath = function (dir, origin, done) {
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
                    exports.readPath(file, origin, function (err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    results.push(exports.splitPath(file.replace(origin, '')));
                    next();
                }
            });

        })();
    });
};