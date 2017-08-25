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

var config = require('./config/config.js');
// load the auth variables
var routes = require('./routes/index.js');

var app = express();

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
