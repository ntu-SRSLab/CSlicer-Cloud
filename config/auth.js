// config/auth.js

var config = require('./config.js');

module.exports = {
    'githubAuth' : {
	'clientID' : 'fad11cb70fecd7d182a0',
	'clientSecret' : '0201a96ed3b60b7bc4ae4a24eceeb41ee32fb0f2',
	'callbackUrl' : config.baseURL + '/auth/github/callback'
    }
};
