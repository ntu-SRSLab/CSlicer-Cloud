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

var config = require('./config/config.js');
// load the auth variables
var configAuth = require('./config/auth.js');
var routes = require('./routes/index.js');

var app = express();

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

app.use(session({
    secret: 'keyboard cat', resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions

app.use(express.static(__dirname + '/public'));

app.engine('html', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

app.use('', routes);

// logging
app.use(function(req, res, next) {
    console.log('%s %s %s', req.method, req.url, req.path);
    next();
});

app.listen(config.port, function () {
  console.log('Listening on port ' + config.port);
});
