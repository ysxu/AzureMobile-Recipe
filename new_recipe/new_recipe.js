/*
 *	Azure Mobile Services - Recipe - $
 *
 *	This is recipe's index script. It includes some common pre-filled function snippets
 *	for table creations, action script uploads, and client file downloads. 

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

 *
 */


// common modules that recipes depend on
var scripty = require('azure-scripty');
var fs = require('fs');
var async = require('async');
var recipe = require('azuremobile-recipe');


// function that gets called when users use this recipe from their project directory
exports.use = function(myMobileservice, callback){

	// async makes sure all functions run asynchronously
	async.series([

		function(callback){

			// prompt users to enter extra information
			recipe.ask("Give me extra info", recipe.REGEXP, function(name) {
				console.log("user input: "+ name);
				callback();
			});
		
		},

	    function(callback){

	    	// creates table 'table_name' and resolves naming conflicts 
			recipe.table_create(myMobileservice,"table_name", function(err, results){
				if (err)
					throw err;
			    callback();
			});

	    },

	    function(callback){

	    	// upload action script for table 'table_name'
	    	console.log("Uploading action scripts...")

			// script path in recipe
			var insertscript = __dirname + '/table/table_name.insert.js';

			// script path in user's directory
			var curdir = process.cwd();
		  	var tabledir = curdir + '/table';
			var myInsertscript = tabledir+ "/" + table_name + '.insert.js';

			// create folder if directory does not exist in user directory
			fs.exists(tabledir, function (exists) {
			  if(!exists){
			  	fs.mkdir(tabledir, function(err){
			  		if (err)
			  			throw err;
			  	});
			  }
			});

			// update scripts
			fs.readFile(insertscript, 'utf8', function (err,data) {
		  		if (err) 
		  			throw err;

		  		// replace placeholders
		  		var result = data.replace(/\$/g, myLeaderboard).replace(/\%/g, myResult);

		  		fs.writeFile(myInsertscript, result, 'utf8', function (err) {
		     		if (err) 
		     			throw err;
		  		});
			});

			// modify uploading script
			var cut = myInsertscript.indexOf(curdir);
			myInsertscript = myInsertscript.slice(0, cut) + myInsertscript.slice(cut+curdir.length+1, myInsertscript.length);
							
			// upload script with CLI commands through azure-scripty
			// equivalent to 'azure mobile script upload <service> <script>'
			scripty.invoke('mobile script upload ' + myMobileservice + ' '+ myInsertscript, function(err, results) {
		  		if (err) return callback(err);
		  		else{
		  			console.log("Action script '"+myInsertscript+"' successfully uploaded.\n");
					callback();
		  		}
			});

	    },

	    // copy client files into user local environments
	    function(callback){
	    	console.log("Downloading client files...");
	    	var folder = 'client_files/Entities';
	    	var file_name = 'Leaderboard.cs';
	    	recipe.file_download(folder, file_name,['\\$','\\%', '\\#'], [myLeaderboard, myResult, myNamespace], 
	    		function(err){
	    			if (err) return callback(err);
	    			callback();
    		});
	    },
	    function(){
	    	callback();
	    }
	]);
}