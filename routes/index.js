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
	github.authenticate({
	    type: "oauth",
	    token: accessToken
	});
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
    github.repos.getAll({
	    visibility: 'public'
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
router.get('/chart/', function(req, res){
    var data = options;
    data.moreDataCallback = true;
    data.mainDataUrl = config.baseURL + "/commits/";
    data.moreDataUrl = config.baseURL + "/commits/from/";
    data.testDataUrl = config.baseURL + "/tests/";
    data.branchDataUrl = config.baseURL + "/branches/";
    data.resultDataUrl = config.baseURL + "/results/";
    res.render('chart.html', data);
});
router.get('/clone/', function(req, res){
    commits.cloneRepo(req.query['owner'], req.query['repo'])
	.then((result)=>{
	    console.log("Rendering charts...");
	    options.repo = result.path();
	    config.toolConfig.repo_path = require("path").dirname(options.repo);
	    res.redirect(config.baseURL + '/chart');
	});
});
router.get('/tests/', function(req, res){
    maven.extractTests(config.toolConfig.repo_path)
        .then((result)=>{
	        res.type('json');
	        res.write(result);
	        res.end();
        });
});
var jsonParser = bodyParser.json();
router.post('/results/', jsonParser, function(req, res){
    config.toolConfig.start = req.body.startcommit;
    config.toolConfig.end = req.body.endcommit;
    config.toolConfig.tests = req.body.testcases;
    config.toolConfig.engine = req.body.slicingopt;
    
    maven.computeResults(config.toolConfig)
	.then((r)=>{
	    // console.log(config.toolConfig);
	    // write to database
	    models.Run.create({
		start: config.toolConfig.start,
		end: config.toolConfig.end,
		tests: config.toolConfig.tests,
		engine: config.toolConfig.engine,
		repo_path: config.toolConfig.repo_path,
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
router.get('/commits/', function(req, res){
    commits.getBaseCommitData({path: options.repo, username: options.username, password: options.password}, {remotes:options.remotes})
        .then((result)=>{
            res.type('json');
            res.write(JSON.stringify(result));
            res.end();
        });
});
router.get('/branches/', function(req, res){
    commits.getBranchTips({path: options.repo, username: options.username, password: options.password}, {remotes:options.remotes})
        .then((branches)=>{
            var result = {values:branches};
            res.type('json');
            res.write(JSON.stringify(result));
            res.end();
        });
});
router.get('/commits/from/:commit', function (req, res) {
    var params = req.params;
    var root = params.commit;
    commits.getAncestorsFor({path: options.repo, username: options.username, password: options.password}, root)
        .then((result)=>{
            res.type('json');
            res.write(JSON.stringify({values:result}));
            res.end();
        });
});

module.exports = router;
