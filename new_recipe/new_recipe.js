/*
 *	Azure Mobile Services - Recipe - $
 *
 *	This is recipe's index script. It includes some common pre-filled function snippets
 *	for table creations, action script uploads, and client file downloads. 
 *
 */


// common modules that recipes depend on
var scripty = require('azure-scripty');
var fs = require('fs');
var async = require('async');
var recipe = require('azuremobile-recipe');


// function that gets called when users use this recipe from their project directory
exports.use = function(myMobileservice){

	// async makes sure all functions run asynchronously
	async.series([

		function(callback){

			// prompt users to enter extra information
			recipe.ask("Give me extra info", /[a-z|A-Z]+/, function(name) {
				console.log("user input: "+ name);
				callback(null, name);
			});
		
		},

	    function(callback){

	    	// creates table 'table_name' and resolves naming conflicts 
			recipe.table_create(myMobileservice,"table_name", function(err, results){
				if (err)
					throw err;
			    callback(err, results);
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
		  		if (err) 
		  			throw err;
		  		else{
		  			console.log("Action script '"+myInsertscript+"' successfully uploaded.\n");
					callback(null, results);
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
	    			if (err)
	    				throw err;
	    			callback(err, 'client file download');
    		});
	    },
	    function(){
	    	process.exit(1);
	    }
	]);
}