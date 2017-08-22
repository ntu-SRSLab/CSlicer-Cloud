/*
This file is part of git-flow-json-commits.

git-flow-json-commits is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

GitFlowVisualize is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with git-flow-json-commits. If not, see <http://www.gnu.org/licenses/>.
*/


var express = require('express')
var mustacheExpress = require('mustache-express');
var passport = require('passport');
var session = require('express-session');

var GitHubApi = require("github");
var github = new GitHubApi({
    debug: false
});

const commits = require('./commits');
const maven = require('./maven');

var GitHubStrategy = require('passport-github2').Strategy;
// load the auth variables
var configAuth = require('./config/auth.js');

const options = require('./config/config.js')([
    { name: 'username', alias: 'u', type: String},
    { name: 'password', alias: 'p', type: String},
]);

var app = express()
app.engine('html', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

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

app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(express.static(__dirname + '/public'));
app.use('/gfv', express.static('node_modules/git-flow-vis/dist'));

app.get('/', function(req, res){
    res.render('index.ejs');
});

app.get('/auth/github', passport.authenticate('github', {
    scope : ["user:email"] }), function(req, res){
    });

app.get('/auth/github/callback', passport.authenticate('github', {
    successRedirect : '/project',
    failureRedirect : '/'
}));
app.get('/project', function(req, res){
    github.repos.getAll({
	    visibility: 'public'
    }, function(err, result) {
	    res.render('project.ejs', {
	        username: req.user.username,
	        profile: req.user.profileUrl,
	        repos: result.data
	    });
    });
});
app.get('/chart/', function(req, res){
    var data = options;
    data.moreDataCallback = true;
    data.mainDataUrl = "/commits/";
    res.render('chart.html', data);
});
app.get('/clone/', function(req, res){
    commits.cloneRepo(req.query['owner'], req.query['repo'])
	.then((result)=>{
	    console.log("Rendering charts...");
	    options.repo = result.path();
	    res.redirect('/chart');
	});
});
app.get('/tests/', function(req, res){
    maven.extractTests(require("path").dirname(options.repo))
        .then((result)=>{
	        res.type('json');
	        res.write(result);
	        res.end();
        });
});
app.get('/commits/', function(req, res){
    commits.getBaseCommitData({path: options.repo, username: options.username, password: options.password}, {remotes:options.remotes})
        .then((result)=>{
            res.type('json');
            res.write(JSON.stringify(result));
            res.end();
        });
});
app.get('/branches/', function(req, res){
    commits.getBranchTips({path: options.repo, username: options.username, password: options.password}, {remotes:options.remotes})
        .then((branches)=>{
            var result = {values:branches};
            res.type('json');
            res.write(JSON.stringify(result));
            res.end();
        });
});
app.get('/commits/from/:commit', function (req, res) {
    var params = req.params;
    var root = params.commit;
    commits.getAncestorsFor({path: options.repo, username: options.username, password: options.password}, root)
        .then((result)=>{
            res.type('json');
            res.write(JSON.stringify({values:result}));
            res.end();
        });
});

app.listen(3000, function () {
  console.log('Listening on port 3000');
  if(!options.username && options.remotes){
      console.log("No username provided, so we will not be able to automtically fetch new data from remotes.");
  }
});
