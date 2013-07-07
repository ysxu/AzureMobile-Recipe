/*
 *
 * RECIPE FUNCTION LIBRARY
 *
 * 
 */

var scripty = require('azure-scripty');
var fs = require('fs');
var me = require('./recipe-functions.js');


// Prompt users to enter information
// Referece: http://st-on-it.blogspot.com/2011/05/how-to-read-user-input-with-nodejs.html
exports.ask = function ask(question, format, callback) {
	var stdin = process.stdin, stdout = process.stdout;

	stdin.resume();
	stdout.write(question + ": ");
	 
	stdin.once('data', function(data) {
		data = data.toString().trim();
	 	
	    if (format.test(data)) {
	    	callback(data);
	   	} else {
	     	stdout.write("It should match: "+ format +"\n");
	     	// problem here
	     	ask(question, format, callback);
	   	}
	});
}

// Create table and performs error handling on existing tablename
exports.table_create = function(myMobileservice, tablename, callback){
	var usertablename = tablename;
	scripty.invoke('mobile table show '+myMobileservice+' '+tablename, function(err, results){
		if (results.columns!="" || results.scripts!=""){
			me.ask("Table '"+tablename+"' exists. Enter a new "+tablename+" name or enter 'conti' to continue with exisiting table", /[a-z|A-Z]+/, function(choice) {
				if (choice.toLowerCase()!='conti'){
					usertablename = choice;
					console.log("New "+tablename+" table '"+usertablename + "' is being created...");
					// create choice table
					scripty.invoke('mobile table create ' + myMobileservice + ' '+ usertablename, function(err, results) {
				  		if (err) 
				  			throw err;
				  		else{
				  			console.log("Table '"+usertablename+"' successfully created.\n");
				  			callback(err, usertablename);
				  		}
					});
				}
				else{
					console.log("Existing table '"+tablename+"' will be used for this module.\n");
					callback(err, usertablename);
				}

			});
		}
		else{
			console.log("New "+tablename+" table '"+usertablename + "' is being created...");
			// create leaderboard table
			scripty.invoke('mobile table create ' + myMobileservice + ' '+ usertablename, function(err, results) {
				if (err) 
				  	throw err;
				else{
					console.log("Table '"+usertablename+"' successfully created.\n");
					callback(err, usertablename);
				}
			});
		}
	});

}


// download files from module to user environment & customization
// file_download(string, string, array, replacement array, callback)
exports.file_download = function(folder, file_name, original, replacement, callback){

	if ((original.length != replacement.length)||(!Array.isArray(original))||(!Array.isArray(replacement))){
		throw new Error("Customization arguments does not satisfy the requirements.");
	}

	// script location
	var script = __dirname + '/../../' + folder + '/' + file_name;

	// user location
	var curdir = process.cwd();
  	var filedir = curdir + '/' + folder;
	var myScript = filedir + "/" + file_name;

	// create client directory for file
	fs.exists(filedir, function (exists) {
	  if(!exists){
	  	fs.mkdir(filedir, function(err){
	  		if (err)
	  			throw err;
	  	});
	  }
	});

	// update scripts with customizable information
	// reference: http://stackoverflow.com/questions/10058814/get-data-from-fs-readfile
	// read in module file
	fs.readFile(script, 'utf8', function (err,data) {
		//console.log(script);
  		if (err) 
  			throw err;

		// replace placeholders
		var result = data;
		for (var i=0; i<replacement.length; i++){
			var pattern = new RegExp(original[i], 'g');
			//console.log(pattern);
			result = result.replace(pattern, replacement[i]);
		}

  		// write to user environment
  		fs.writeFile(myScript, result, 'utf8', function (err) {
     		if (err) 
     			throw err;
     		console.log(folder + '/' + file_name + ' is downloaded.');
     		callback(err);
  		});
	});

}