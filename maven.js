var spawn = require("child_process").spawn;
const path = require("path");

var _cachedTests = {};

function extractTests(repo_path){
    var promise;
    if (repo_path in _cachedTests) {
		promise = new Promise((res)=>{res( _cachedTests[repo_path]);});
    } else {
		promise = new Promise(function(fulfill, reject){
			console.log("Runing mvn compiler:compile in " + repo_path + " ...");
	    	var mvnCompile = spawn('mvn', ["compiler:compile"], {
    			cwd: repo_path
	    	});
			mvnCompile.stderr.on('data', (data) => {
    			reject(data);
	    	});
			mvnCompile.on('close', (code) => {
				if (code !== 0) {
					console.log('mvn compiler:compile failed');
					return;
				}	
	    		console.log("Runing mvn compiler:testCompile in " + repo_path + " ...");
	    		var mvnTestCompile = spawn('mvn', ["compiler:testCompile"], {
					cwd: repo_path
	    		});
				mvnTestCompile.stderr.on('data', (data) => {
					reject(data.toString());
				});
				mvnTestCompile.on('close', (code) => {
					if (code !== 0) {
						console.log("mvn compiler:testCompile failed");
						return;
					}	
					console.log("Extracting test cases ...");
					var extractTests = spawn('python',
							["extract_tests.py",
							 path.join(repo_path, 
								"target/maven-status/maven-compiler-plugin/testCompile/default-cli/inputFiles.lst"),
							 repo_path, 
							 "test_methods_distiller.jar"], 
							 { 	cwd: path.join(__dirname, "public/scripts/"),
								stdio: 'pipe'
							 });
					extractTests.stderr.on('data', (data) => {
						reject(data.toString());
					});
					var result = '';
					extractTests.stdout.on('data', (data) => {
						result += data.toString();
					})
					extractTests.on('close', (code) => {
						if (code !== 0) {
							console.log("extract test cases failed");
							return;
						}
						fulfill(result);
					})
				});
			});
	    });
		_cachedTests[repo_path] = promise;
    }

    return promise;
}

module.exports = {
    extractTests: extractTests
}
