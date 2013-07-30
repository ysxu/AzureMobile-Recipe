exports.REGYN = /^(y|n|yes|no)$/i;

exports.ask = function (question, format, callback) {
    var stdin = process.stdin;
    var stdout = process.stdout;

    if ((arguments.length === 2) && (Object.prototype.toString.call(format) === "[object Function]")) {
        callback = format;
        format = exports.REGEXP;
    }

    stdin.resume();
    stdout.write(question + ": ");

    stdin.once('data', function (data) {
        data = data.toString().trim();

        if (format.test(data)) {
            callback(data);
        } else {
            stdout.write("Input format does not match \n");
            exports.ask(question, format, callback);
        }
    });
}

exports.ask("Would you like to overwrite?(Y/N)", exports.REGYN, function (choice) {
	console.log(choice);});