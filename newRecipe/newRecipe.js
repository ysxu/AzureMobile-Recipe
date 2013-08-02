/*
 *
 *	This is recipe's index script. It includes some common pre-filled function snippets
 *	for table creations, action script uploads, and client file downloads.
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

// function that gets called when users use this recipe from their project directory
exports.use = function (myMobileservice, recipe, callback) {

    // async makes sure all functions run asynchronously
    async.series([

        function (callback) {

            // prompt users to enter extra information
            recipe.ask("Give me extra info", function (name) {
                console.log("user input: " + name);
                callback();
            });
        },

        function (callback) {

            // creates table 'table_name' and resolves naming conflicts 
            recipe.createTable(myMobileservice, "table_name", function (err, results) {
                if (err) return callback(err);
                var resolved_table_name = results;
                callback();
            });
        },

        function (callback) {

            // logging
            recipe.log.info("Copying & Uploading action scripts...")

            // copying action scripts
            var action_file = [{
                dir: '',
                file: '',
                new_dir: '',
                new_file: '',
                original: [],
                replacement: []
            }];

            recipe.copyFiles(recipename, action_file, function (err) {
                if (err) return callback(err);
                callback();
            });
        },

        function (callback) {

            // upload script with CLI commands through azure-scripty
            // equivalent to 'azure mobile script upload <service> <script>'
            recipe.scripty.invoke('mobile script upload ' + myMobileservice + ' table/table_name.insert.js', function (err, results) {
                if (err) return callback(err);
                else {
                    recipe.log.info("Action script '" + myInsertscript + "' successfully uploaded.\n");
                    callback();
                }
            });

        }

        function () {
            callback();
        }
    ]);
}