var express = require('express');
var router = express.Router();

var passport = require('passport');
var bodyParser = require('body-parser');
var config = require('../config/config.js');
var configAuth = require('../config/auth.js');
var session = require('express-session');

var models = require("../models/index.js");

var GitHubApi = require("github");
var github = new GitHubApi({
    debug: false
});

var repo_path = {};
function repo_name (owner, repo) {
    return owner + "/" + repo;
}

const options = require('../config/gfv.js')([
    { name: 'username', alias: 'u', type: String},
    { name: 'password', alias: 'p', type: String},
]);

const commits = require('./commits');
const maven = require('./maven');

var GitHubStrategy = require('passport-github2').Strategy;
// required for passport
passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});
passport.use(new GitHubStrategy({
    clientID: configAuth.githubAuth.clientID,
    clientSecret: configAuth.githubAuth.clientSecret,
    callbackURL: configAuth.githubAuth.callbackURL,
}, function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
	// github.authenticate({
	//    type: "oauth",
	//   OA token: accessToken
	// });
	return done(null, profile);
    });
}));

router.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
router.use(passport.initialize());
router.use(passport.session()); // persistent login sessions

router.use('/gfv', express.static('node_modules/git-flow-vis/dist'));
router.get('/', function(req, res){
    res.render('index.ejs', {
	baseURL: config.baseURL
    });
});
router.get('/auth/github', passport.authenticate('github', {
    scope : ["user:email"] }), function(req, res){
    });
router.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect : config.baseURL + '/project',
    failureRedirect : config.baseURL + '/'
}));
router.get('/project', function(req, res){
    github.repos.getForUser({
	username: req.user.username
    }, function(err, result) {
	// console.log(result.data);
	res.render('project.ejs', {
	    username: req.user.username,
	    profile: req.user.profileUrl,
	    repos: result.data,
	    baseURL: config.baseURL
	});
    });
});
router.get('/:owner/:repo/chart/', function(req, res){
    var owner = req.params['owner'];
    var repo = req.params['repo'];
    var prefix = config.baseURL + "/" + repo_name(owner, repo);
    
    // clone
    commits.cloneRepo(owner, repo)
	.then((result)=>{
	    repo_path[repo_name(owner, repo)] =
		require("path").dirname(result.path());
	    console.log("Redirecting to the chart page ...");
	    // render
	    var data = options;
	    data.moreDataCallback = true;
	    data.baseUrl = config.baseURL;
	    data.mainDataUrl = prefix + "/commits/";
	    data.moreDataUrl = prefix + "/commits/from/";
	    data.testDataUrl = prefix + "/tests/";
	    data.branchDataUrl = prefix + "/branches/";
	    data.resultDataUrl = prefix + "/results/";
	    res.render('chart.html', data);
	});
});
router.get('/:owner/:repo/tests/', function(req, res){
    var owner = req.params['owner'];
    var repo = req.params['repo'];
    maven.extractTests(repo_path[repo_name(owner, repo)])
        .then((result)=>{
	        res.type('json');
	        res.write(result);
	        res.end();
        });
});
var jsonParser = bodyParser.json();
router.post('/:owner/:repo/results/', jsonParser, function(req, res){
    var toolConfig = {};
    var owner = req.params['owner'];
    var repo = req.params['repo'];
    toolConfig.repo_path = repo_path[repo_name(owner, repo)];
    toolConfig.start = req.body.startcommit;
    toolConfig.end = req.body.endcommit;
    toolConfig.tests = req.body.testcases;
    toolConfig.engine = req.body.slicingopt;
    
    maven.computeResults(toolConfig)
	.then((r)=>{
	    // write to database
	    models.Run.create({
		start: toolConfig.start,
		end: toolConfig.end,
		tests: toolConfig.tests,
		engine: toolConfig.engine,
		repo_path: toolConfig.repo_path,
		result: r
	    })
		.then((anotherRun) => {
		    console.log("Successfully written to database.");
		})
		.catch(error => {
		    console.log("Failed to write to database.");
		    console.log(error);
		});

	    // write to result page
	    res.type('json');
	    res.write(r);
	    res.end();
	});
});
router.get('/:owner/:repo/commits/', function(req, res){
    var owner = req.params['owner'];
    var repo = req.params['repo'];
    commits.getBaseCommitData({
	path: repo_path[repo_name(owner,repo)],
	username: options.username,
	password: options.password}, {remotes:options.remotes})
        .then((result)=>{
            res.type('json');
            res.write(JSON.stringify(result));
            res.end();
        });
});
router.get('/:owner/:repo/branches/', function(req, res){
    var owner = req.params['owner'];
    var repo = req.params['repo'];
    commits.getBranchTips({
	path: repo_path[repo_name(owner, repo)],
	username: options.username,
	password: options.password}, {remotes:options.remotes})
        .then((branches)=>{
            var result = {values:branches};
            res.type('json');
            res.write(JSON.stringify(result));
            res.end();
        });
});
router.get('/:owner/:repo/commits/from/:commit', function (req, res) {
    var params = req.params;
    var root = params.commit;
    var owner = params.owner;
    var repo = params.repo;
    commits.getAncestorsFor({
	path: repo_path[repo_name(owner, repo)],
	username: options.username,
	password: options.password}, root)
        .then((result)=>{
            res.type('json');
            res.write(JSON.stringify({values:result}));
            res.end();
        });
});

module.exports = router;
