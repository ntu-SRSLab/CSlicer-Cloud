var sync = require("child_process").spawnSync;
const path = require("path");

var _cachedTests = {};

function extractTests(repo_path){
    var promise;
    if (repo_path in _cachedTests) {
	promise = new Promise((res)=>{res( _cachedTests[repo_path]);});
    } else {
	promise = new Promise(function(fulfill, reject){
	    console.log("Runing mvn compiler:compile in " + repo_path + " ...");
	    var mvnCompile = sync('mvn', ["compiler:compile"], {
    		cwd: repo_path
	    });
	    if (mvnCompile.status !== 0) {
    		console.log("mvn compiler:compile failed");
		// console.log(extractTests.stderr.toString());
    		reject(extractTests.stderr.toString());
	    }
	    
	    console.log("Runing mvn compiler:testCompile in " + repo_path + " ...");
	    var mvnTestCompile = sync('mvn', ["compiler:testCompile"], {
		cwd: repo_path
	    });
	    if (mvnTestCompile.status !== 0) {
		console.log("mvn compiler:testCompile failed");
		// console.log(extractTests.stderr.toString());
		reject(extractTests.stderr.toString());
	    }
	    
	    console.log("Extracting test cases ...");
	    var extractTests = sync('python',
				    ["extract_tests.py",
				     path.join(repo_path, "target/maven-status/maven-compiler-plugin/testCompile/default-cli/inputFiles.lst"),
				     repo_path,
				     "test_methods_distiller.jar"], {
					 cwd: path.join(__dirname, "public/scripts/"),
					 stdio: 'pipe'
    				     });
	    if (extractTests.status !== 0) {
		console.log("extract test cases failed");
		// console.log(extractTests.stderr.toString());
		reject(extractTests.stderr.toString());
	    }

	    fulfill(extractTests.stdout.toString());
	});
	_cachedTests[repo_path] = promise;
    }

    return promise;
}

module.exports = {
    extractTests: extractTests
}
