var spawn = require("child_process").spawn;
const path = require("path");

var _cachedTests = {};
var _cachedResults = {};

function computeResults(toolConfig) {
    var promise;
    var config_id = JSON.stringify(toolConfig);
    
    if (config_id in _cachedResults) {
	console.log("Fetching results ...");
	promise = new Promise((res)=>{res( _cachedResults[config_id]);});
    } else {
	promise = new Promise(function(fulfill, reject){
	    console.log("Running " + toolConfig.engine + " in " + toolConfig.repo_path + " ...");
	    var cslicerRun = spawn('python', ["run_cslicer.py",
					      toolConfig.repo_path,
					      toolConfig.start,
					      toolConfig.end,
					      toolConfig.tests,
					      toolConfig.excludes,
					      toolConfig.engine], {
		cwd: path.join(__dirname, "../public/scripts/"),
		stdio: 'pipe'
	    });
	    cslicerRun.stderr.on('data', (data) => {
		reject(data);
	    });
	    var result = '';
	    cslicerRun.stdout.on('data', (data) => {
		result += data.toString();
	    });
	    cslicerRun.on('close', (code) => {
		console.log("code: " + code);
		console.log("result: " + result);
		if (code !== 0) {
		    console.log("CSlicer run failed");
		    return;
		}
		fulfill(result);
	    });
	    // fulfill('{"simple": ["3637948", "86e6c65"], "full": [["3637948"], ["86e6c65"]]}');
	});
	_cachedResults[config_id] = promise;
    }
    return promise;
}

function extractTests(repo_path){
    var promise;
    if (repo_path in _cachedTests) {
	console.log("Fetching tests ...");
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
					     {
 						 cwd: path.join(__dirname, "../public/scripts/"),
						 stdio: 'pipe'
					     });
		    extractTests.stderr.on('data', (data) => {
			reject(data.toString());
		    });
		    var result = '';
		    extractTests.stdout.on('data', (data) => {
			result += data.toString();
		    });
		    extractTests.on('close', (code) => {
			if (code !== 0) {
			    console.log("extract test cases failed");
			    return;
			}
			fulfill(result);
		    });
		});
	    });
	});
	_cachedTests[repo_path] = promise;
    }
    
    return promise;
}

module.exports = {
    extractTests: extractTests,
    computeResults: computeResults
}
