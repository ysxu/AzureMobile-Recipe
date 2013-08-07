/*
 *
 *	This is recipe's index script. It includes some common pre-filled function snippets
 *	for table creations, action script uploads, and client file downloads.
 *
 *
 */

/*
   Azure Mobile Services - Recipe - $

    Copyright YYYY AuthorName

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

// function that gets called when users execute this recipe from their project directory
exports.execute = function (myMobileservice, recipe, callback) {

    // More function reference: https://github.com/ysxu/AzureMobile-Recipe/blob/master/recipeUtils.js

    // modules provided (recipes can also depend on modules specified in package.json)
    var scripty = recipe.scripty; // More reference: https://github.com/glennblock/azure-scripty
    var async = recipe.async; // More reference: https://github.com/caolan/async
    var fs = recipe.fs;
    var path = recipe.path;
    var exec = recipe.exec;

    // logging
    var log = recipe.cli.output; // log.info, log.warn, log.error

    // regex constant for user input
    var REGEXP = recipe.REGEXP; // for azure related input: /^[a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/
    var REGYN = recipe.REGYN; // for yes/no: /^(y|n|yes|no)$/i
    
    // async makes sure all functions run asynchronously
    async.series([

        function (callback) {

            // prompt users to enter extra information
            recipe.ask("Give me extra info", REGEXP, "customized error message" function (name) {
                console.log("This is the user input: " + name);
                callback();
            });
        },

        function (callback) {

            // creates table 'tableName' and resolves naming conflicts 
            recipe.createTable(myMobileservice, "tableName", function (err, results) {
                if (err) return callback(err);
                var resolvedTableName = results;
                callback();
            });
        },

        function (callback) {

            // creates job 'jobName' and resolves naming conflicts 
            recipe.createJob(myMobileservice, "jobName", function (err, results) {
                if (err) return callback(err);
                var resolvedJobName = results;
                callback();
            });
        },

        function (callback) {

            // logging
            log.info("Copying & Uploading action scripts...");

            // script info
            var tableScript = [{
                dir: 'dir',
                file: 'file',
                newDir: 'newDir',
                newFile: 'newFile',
                original: ['placeholder'],
                replacement: ['customizedValue']
            }];

            // copy all files in object following the specified info
            recipe.copyFiles(recipename, tableScript, function (err) {
                if (err) return callback(err);
                callback();
            });
        },

        function (callback) {

            var myScriptPath = 'server_files/table/resolvedTableName.insert.js';

            // progress log
            var progress = recipe.cli.progress('Uploading table script \'' + myInsertscript + '\'');

            // upload script with CLI commands through azure-scripty
            // equivalent to 'azure mobile script upload <service> <script>'
            scripty.invoke('mobile script upload ' + myMobileservice + ' table/resolvedTableName.insert.js -f ' + myScriptPath, function (err, results) {
                progress.end();
                if (err) return callback(err);
                callback();
            });

        }
    ],

    function (err, results) {
        if (err) throw err;
        callback();
    });
}