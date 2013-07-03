var exec = require('child_process').exec;
var async = require('async');
var recipe = require('./recipe-functions.js');

module.exports.init = function (cli) {
	//var recipe = cli.output;
	var mobile = cli.category('mobile');
	mobile.command('recipe [recipename]')
	.description('Commands to use Mobile Services Recipes')
	.execute(function (recipename, options, callback) {
		console.log("call npm ls -g of sorts");

		async.series([
			function(callback){
				// error check: recipename
				if (!recipename){
					recipe.ask("\nEnter a recipe name or 'list' to see installed recipes", /[a-z|A-Z]+/, function(name) {
						recipename=name;
						callback(null, 'one');
					});
				}
				else
					callback(null, 'one');
			},
			function(callback){
				// display all recipes
				if (recipename=="list")
				{
					console.log("display all list here:");
					callback(null, 'two');
				}
				// download recipe templates
				else if (recipename=="create"){
					console.log("downloading recipe template files :D");
					callback(null, 'two');
				}
				// execute recipe
				else{
					// get recipe
					var recipe_path = __dirname+'/../azuremobile-'+recipename+'/'+recipename+'.js';
					var recipe_name = require(recipe_path);
					
					// call recipe
					recipe_name.use();

					// see if given recipename is in list
					//console.log("\n assuming the recipe does exist");
					//console.log("recipes should always be named azuremobile-recipename");
				}
			},
			function(){
				callback(null);
			}
		]);

	});
};