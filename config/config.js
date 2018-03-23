var config = {};

config.baseURL = '/~liyi/cslicer';
//config.baseURL = '';
config.port = 40140;
//config.port = '3000';
config.mysql = {
    username: 'root',
    password: 'cslicer-cloud-admin',
    database: 'cslicer-db',
    host: '127.0.0.1',
    port: '40141'
};

module.exports = config;
