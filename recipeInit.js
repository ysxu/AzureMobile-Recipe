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

var recipe = require('./recipeUtils.js');

module.exports.init = function (cli) {
    var mobile = cli.category('mobile');
    var log = cli.output;
    var mobileRecipe = mobile.category('recipe');

    mobileRecipe.description('Commands to use Mobile Services Recipes');

    recipe.log = log;

    /*
     * list all globally installed recipes
     */

    mobileRecipe.command('list')
        .description('List the installed recipes')
        .execute(function (recipename, options, callback) {

            var file_list = recipe.fs.readdirSync(recipe.path.join(__dirname,'..'));
            var recipe_list = [];
            for (var i in file_list) {
                // find azuremobile-recipename
                if ((file_list[i].substring(0, 12) === "azuremobile-") && (file_list[i] !== "azuremobile-recipe")) {
                    recipe_list.push(file_list[i].slice(12));
                }
            }

            log.info("\n");
            if (recipe_list.length > 0) {
                log.info("Installed Recipes:");
                for (var i in recipe_list) {
                    log.data(' -' + recipe_list[i]);
                }
            }
            else {
                log.info("No installed recipes found.");
            }
            log.info("\n");
            
            callback();
        });


    /*
     * copy to user directory recipe templates
     */

    mobileRecipe.command('create [recipename]')
        .usage('[recipename] [options]')
        .description('Retrieve template files for creating a new recipe')
        .execute(function (recipename, options, callback) {

            var azure_recipe = '';
            var original;
            var replacement;
            
            recipe.async.series([
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
                    var child = recipe.exec('npm owner ls ' + azure_recipe, function (error, stdout, stderr) {
                        if (!error) { 
                            throw new Error('Recipe name ' + azure_recipe + ' already exists in npm directory');
                        }
                        callback();
                    });
                },
                function (callback) {
                    // retrieve and copy template files
                    original = ['\\$'];
                    replacement = [recipename];

                    // find all new recipe files
                    recipe.readPath(recipe.path.join(__dirname, 'new_recipe'), __dirname, function (err, results) {
                        if (err) return callback(err);
                        files = results;
                        callback();
                    });
                },
                function (callback) {
                    // copy all client files and create directories
                    recipe.async.forEachSeries(
                        files,
                        function (file, done) {

                            if (file.file === 'new_recipe.js')
                            {
                                recipe.copyRecipeFile(file.dir.replace(__dirname,''), file.file, azure_recipe, recipename+'.js', original, replacement,
                                    function (err) {
                                        if (err) return callback(err);
                                        done();
                                    });
                            }
                            else {
                                recipe.copyRecipeFile(file.dir.replace(__dirname,''), file.file, azure_recipe, '', original, replacement,
                                    function (err) {
                                        if (err) return callback(err);
                                        done();
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
                    var clientdir = recipe.path.join(process.cwd(), azure_recipe, 'client_files');
                    // create client_files directory
                    recipe.fs.stat(clientdir, function (err,stat) {
                        if (!(stat && stat.isDirectory())) {
                            recipe.fs.mkdir(clientdir, function (err) {
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

            recipe.async.series([
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
                    log.info('Validating mobile service ' + servicename + '...');
                    recipe.scripty.invoke('mobile show ' + servicename, function (err, results) {
                        if (err) return callback(err);
                        log.info('Validated.\n');
                        callback();
                    });
                },
                function (callback) {
                    // call recipe
                    var recipe_path = recipe.path.join(__dirname, '..', 'azuremobile-'+recipename, recipename+'.js');
                    var recipe_name = require(recipe_path);
                    recipe_name.use(servicename, recipe, function (err){
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