/*
   Azure Mobile Services - Recipe Core Module

    Copyright 2013 Mimi Xu

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

 */

var exec = require('child_process').exec;
var async = require('async');
var scripty = require('azure-scripty');
var fs = require('fs');
var path = require('path');
var recipe = require('./recipeUtils.js');

module.exports.init = function (cli) {
    var mobile = cli.category('mobile');
    var log = cli.output;
    var mobileRecipe = mobile.category('recipe');

    mobileRecipe.description('Commands to use Mobile Services Recipes');


    /*
     * list all globally installed recipes
     */

    mobileRecipe.command('list')
        .description('List the installed recipes')
        .execute(function (recipename, options, callback) {

            var file_list = fs.readdirSync(path.join(__dirname,'..'));
            var recipe_list = [];
            for (var i in file_list) {
                // find azuremobile-recipename
                if ((file_list[i].substring(0, 12) === "azuremobile-") && (file_list[i] !== "azuremobile-recipe")) {
                    recipe_list.push(file_list[i].slice(12));
                }
            }

            console.log("\nInstalled Azure Mobile Services Recipes:");
            for (var i in recipe_list) {
                console.log(' -' + recipe_list[i]);
            }
            
            callback();
        });


    /*
     * download to user directory recipe templates
     */

    mobileRecipe.command('create [recipename]')
        .usage('[recipename] [options]')
        .description('Retrieve template files for creating a new recipe')
        .execute(function (recipename, options, callback) {

            var azure_recipe = '';
            async.series([
                function (callback) {
                    // error check: recipename
                    if (!recipename) {
                        recipe.ask("\nRecipe name", recipe.REGEXP, function (name) {
                            recipename = name;
                            callback();
                        });
                    } else callback();
                },
                function (callback) {
                    azure_recipe = 'azuremobile-' + recipename;
                    // check if recipe exists in npm directory
                    var child = exec('npm owner ls ' + azure_recipe, function (error, stdout, stderr) {
                        if (!error) { 
                            throw new Error('Recipe name ' + azure_recipe + ' already exists in npm directory');
                        }
                        callback();
                    });
                },
                function (callback) {
                    // retrieve and download template files
                    original = ['\\$'];
                    replacement = [recipename];

                    // find all new recipe files
                    recipe.readPath(path.join(__dirname, 'new_recipe'), function (err, results) {
                        if (err) return callback(err);
                        files = results;
                        callback(err, results);
                    });
                },
                function (callback) {
                    // download all client files and create directories
                    async.forEachSeries(
                        files,
                        function (file, done) {
                            if (file.file === 'new_recipe.js')
                            {
                                recipe.downloadRecipeFile([file.dir.replace(__dirname,''), azure_recipe], [file.file, recipename+'.js'], original, replacement,
                                    function (err) {
                                        if (err) return callback(err);
                                        done(err);
                                    });
                            }
                            else {
                                recipe.downloadRecipeFile([file.dir.replace(__dirname,''), azure_recipe], [file.file], original, replacement,
                                    function (err) {
                                        if (err) return callback(err);
                                        done(err);
                                    });
                            }
                        },
                        function (err) {
                            if (err) return callback(err);
                            callback();
                        });
                },
                function (callback) {
                    // new recipe client_files directory
                    var clientdir = path.join(process.cwd(), azure_recipe, 'client_files');
                    // create client_files directory
                    fs.stat(clientdir, function (err,stat) {
                        if (!(stat && stat.isDirectory())) {
                            fs.mkdir(clientdir, function (err) {
                                if (err) return callback(err);
                                callback();
                            });
                        } 
                        else 
                            callback();
                    });
                },
                function () {
                    callback();
                }
            ]);
        });


    /*
     * use recipes
     */

    mobileRecipe.command('use [recipename] [servicename]')
        .usage('[recipename] [servicename] [options]')
        .description('Use a mobile service recipe')
        .execute(function (recipename, servicename, options, callback) {

            async.series([
                function (callback) {
                    // error check: recipename
                    if (!recipename) {
                        recipe.ask("\nRecipe name", recipe.REGEXP, function (name) {
                            recipename = name;
                            callback();
                        });
                    } else
                        callback();
                },
                function (callback) {
                    // error check: servicename
                    if (!servicename) {
                        recipe.ask("\nMobile Service name", recipe.REGEXP, function (name) {
                            servicename = name;
                            callback();
                        });
                    } else
                        callback();
                },
                function (callback) {
                    // error check: service exists
                    console.log('Validating mobile service ' + servicename + '...');
                    scripty.invoke('mobile show ' + servicename, function (err, results) {
                        if (err) return callback(err);
                        console.log('Validated.\n');
                        callback();
                    });
                },
                function (callback) {
                    // call recipe
                    var recipe_path = path.join(__dirname, '..', 'azuremobile-'+recipename, recipename+'.js');
                    var recipe_name = require(recipe_path);
                    recipe_name.use(servicename, function (err){
                        if (err) return callback(err);
                        callback();
                    });
                },
                function () {
                    callback();
                }
            ]);

        });
};