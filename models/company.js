'use strict';

module.exports = (sequelize, DataTypes) => {
    var Company = sequelize.define('Company', {
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING,

        defaultMon: DataTypes.STRING,
        defaultTue: DataTypes.STRING,
        defaultWed: DataTypes.STRING,
        defaultThu: DataTypes.STRING,
        defaultFri: DataTypes.STRING,
        defaultSat: DataTypes.STRING,
        defaultSun: DataTypes.STRING
    }, {
        tableName: 'company'
    });

    return Company;
};
