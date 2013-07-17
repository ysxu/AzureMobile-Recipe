var exec = require('child_process').exec;
var async = require('async');
var recipe = require('./recipe-functions.js');
var fs = require('fs');
var scripty = require('azure-scripty');


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
        
        var file_list = fs.readdirSync(__dirname+'/../');
        var recipe_list = [];

        for (var i in file_list) {
        	// find azuremobile-recipename
        	if ((file_list[i].substring(0, 12) == "azuremobile-") && (file_list[i] != "azuremobile-recipe")) {
        		recipe_list.push(file_list[i].slice(12));
        	}
        }

        console.log("\nInstalled Azure Mobile Services Recipes:");
        for (var i in recipe_list) {
        	console.log( ' -' + recipe_list[i]);
        }

		// ***************************************************************TODO: show versions
		// problem with npm list -g --depth=0
		/*
		var child = exec('npm list -g --depth=0',
			function(error, stdout, stderr){
				console.log('stdout: '+stdout+'\n');
				//console.log('stderr: '+stderr+'\n');
				callback(null, 'two');
			}
		);*/
	});


	/*
	 * download to user directory recipe templates
	 */

	mobileRecipe.command('create [recipename]')
	.usage('[recipename] [options]')
	.description('Retrieve template files for creating a new recipe')
    .execute(function (recipename, options, callback) {


    	var folder = './new_recipe';
    	var new_folder = '';
    	var azure_recipe = '';

    	async.series([

    		/***** recipe name error handling *****/

			function(callback){
				// error check: recipename
				if (!recipename){
					recipe.ask("\nRecipe name", /^[a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/, function(name) {
						recipename=name;
						callback(null, 'one');
					});
				}
				else
					callback(null, 'one');
			},
			function(callback){
				// error check: recipename/command conflicts
				if ((recipename=='create')||(recipename=='list')) {
					throw new Error('Azure Mobile Recipe contains the command ' + recipename);	
				}
				else {
					azure_recipe = 'azuremobile-'+recipename;
					new_folder = './' + azure_recipe;
					callback(null, 'two');
				}
			},
			function(callback){
				// check if recipe exists in npm directory
				var child = exec('npm owner ls azuremobile-'+recipename, function(error, stdout, stderr){
					if (!error) {
						throw new Error('Recipe name azuremobile-' + recipename + ' already exists in npm directory');
					}
					callback(null, 'three');
				});
			},

			/***** new recipe directories *****/

			function(callback){
				var curdir = process.cwd();
		    	var clientdir = curdir + '/' + azure_recipe;
		    	// create recipename directory
				fs.exists(clientdir, function (exists) {
				  if(!exists){
				  	fs.mkdir(clientdir, function(err){
				  		if (err)
				  			throw err;
				  		callback(null, 'client dir');
				  	});
				  }
				  else
				  	callback(null, 'client dir');
				});
			},
			function(callback){
				var curdir = process.cwd();
		    	var clientdir = curdir + '/' + azure_recipe + '/client_files';
		    	// create client_files directory
				fs.exists(clientdir, function (exists) {
				  if(!exists){
				  	fs.mkdir(clientdir, function(err){
				  		if (err)
				  			throw err;
				  		callback(null, 'client dir');
				  	});
				  }
				  else
				  	callback(null, 'client dir');
				});
			},
			function(callback){
				var curdir = process.cwd();
		    	var clientdir = curdir + '/' + azure_recipe + '/server_files';
		    	// create server_files directory
				fs.exists(clientdir, function (exists) {
				  if(!exists){
				  	fs.mkdir(clientdir, function(err){
				  		if (err)
				  			throw err;
				  		callback(null, 'client dir');
				  	});
				  }
				  else
				  	callback(null, 'client dir');
				});
			},
			function(callback){
				var curdir = process.cwd();
		    	var clientdir = curdir + '/' + azure_recipe + '/server_files/api';
		    	// create api directory
				fs.exists(clientdir, function (exists) {
				  if(!exists){
				  	fs.mkdir(clientdir, function(err){
				  		if (err)
				  			throw err;
				  		callback(null, 'client dir');
				  	});
				  }
				  else
				  	callback(null, 'client dir');
				});
			},
			function(callback){
				var curdir = process.cwd();
		    	var clientdir = curdir + '/' + azure_recipe + '/server_files/table';
		    	// create table directory
				fs.exists(clientdir, function (exists) {
				  if(!exists){
				  	fs.mkdir(clientdir, function(err){
				  		if (err)
				  			throw err;
				  		callback(null, 'client dir');
				  	});
				  }
				  else
				  	callback(null, 'client dir');
				});
			},
			function(callback){
				var curdir = process.cwd();
		    	var clientdir = curdir + '/' + azure_recipe + '/server_files/shared';
		    	// create shared directory
				fs.exists(clientdir, function (exists) {
				  if(!exists){
				  	fs.mkdir(clientdir, function(err){
				  		if (err)
				  			throw err;
				  		callback(null, 'client dir');
				  	});
				  }
				  else
				  	callback(null, 'client dir');
				});
			},
			
			/***** retrieve and download template files *****/

			function(callback){
		    	recipe.recipe_file_download([folder, new_folder], ['package.json'], ['\\$'], [recipename], 
		    		function(err){
		    			if (err)
		    				throw err;
		    			callback(err, 'template file download');
	    		});
		    },
			function(callback){
		    	recipe.recipe_file_download([folder, new_folder], ['README.md'], ['\\$'], [recipename], 
		    		function(err){
		    			if (err)
		    				throw err;
		    			callback(err, 'template file download');
	    		});
		    },
			function(callback){
		    	recipe.recipe_file_download([folder, new_folder], ['new_recipe.js', recipename+'.js'], ['\\$'], [recipename], 
		    		function(err){
		    			if (err)
		    				throw err;
		    			callback(err, 'template file download');
	    		});
		    },
			function(callback){
		    	recipe.recipe_file_download([folder, new_folder], ['LICENSE.txt'], ['\\$'], [recipename], 
		    		function(err){
		    			if (err)
		    				throw err;
		    			callback(err, 'template file download');
	    		});
		    },
		    function(){
		    	process.exit(1);
		    }]);
    });


    /*
     * use recipes
     */

    mobileRecipe.command('use [recipename] [servicename]')
    .usage('[recipename] [servicename] [options]')
    .description('Use a mobile service recipe')
    .execute(function (recipename, servicename, options, callback) {

        async.series([
			function(callback){
				// error check: recipename
				if (!recipename){
					recipe.ask("\nRecipe name", /^[a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/, function(name) {
						recipename=name;
						callback(null, 'one');
					});
				}
				else
					callback(null, 'one');
			},
			function(callback){
				// error check: servicename is entered
				if (!servicename){
					recipe.ask("\nMobile Service name", /^[a-zA-Z][0-9a-zA-Z-]*[0-9a-zA-Z]$/, function(name) {
						servicename=name;
						callback(null, 'one');
					});
				}
				else
					callback(null, 'one');
			},
			function(callback){
		        // error check: service exists
		        console.log('Validating mobile service '+ servicename +'...');
				scripty.invoke('mobile show '+ servicename, function(err, results) {
		    		if (err)
		    			throw err;
		    		console.log('Validated.\n');
		        	callback(err, results);
				});
	    	},
			function(callback){
				// get recipe
				var recipe_path = __dirname+'/../azuremobile-'+recipename+'/'+recipename+'.js';
				var recipe_name = require(recipe_path);
				
				// ******************************************** TODO: pass in servicename to recipes
				// call recipe
				recipe_name.use(servicename);
			},
			function(){
				callback(null);
			}
		]);

	});
};