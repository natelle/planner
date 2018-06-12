'use strict';

module.exports = (sequelize, DataTypes) => {
    var Company = sequelize.define('Company', {
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING
    }, {
        tableName: 'company'
    });

    return Company;
};
