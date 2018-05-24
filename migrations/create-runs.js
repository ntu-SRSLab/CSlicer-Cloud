"use strict";

module.exports = {
    up: function (queryInterface, Sequelize) {
	return queryInterface
	    .createTable('Runs', {
		id: {
		    type: Sequelize.INTEGER,
		    primaryKey: true,
		    autoIncrement: true
		},
		createdAt: {
		    type: Sequelize.DATE
		},
		updatedAt: {
		    type: Sequelize.DATE
		},
		engine: Sequelize.STRING,
		repo_path: Sequelize.STRING,
		start: Sequelize.STRING,
		end: Sequelize.STRING,
		tests: Sequelize.STRING,
		excludes: Sequelize.STRING,
		result: Sequelize.STRING
	    });
    },

    down: function (queryInterface, Sequelize) {
	return queryInterface
	    .dropTable('Runs');
    }
};
