module.exports = function() {
    var db = {};

    db.Sequelize = require('sequelize');
    db.sequelize = new db.Sequelize('planner', 'root', '', {
        host: 'localhost',
        dialect: 'mysql',
        operatorsAliases: false
    });

    db.Employee = require("./employee.js")(db.sequelize, db.Sequelize);

    return db;
};
