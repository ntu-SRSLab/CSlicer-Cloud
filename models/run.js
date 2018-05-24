"use strict";

module.exports = function(sequelize, DataTypes) {
    var Run = sequelize.define("Run", {
	engine: DataTypes.STRING,
	repo_path: DataTypes.STRING,
	start: DataTypes.STRING,
	end: DataTypes.STRING,
	tests: DataTypes.STRING,
	excludes: DataTypes.STRING,
	result: DataTypes.STRING
	// tests: DataTypes.ARRAY(DataTypes.STRING),
	// result: DataTypes.ARRAY(DataTypes.STRING)
    });

    return Run;
}
