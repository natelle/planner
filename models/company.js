'use strict';

module.exports = (sequelize, DataTypes) => {
    var Company = sequelize.define('Company', {
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING
    }, {
        tableName: 'company'
    });

    Company.associate = function(models) {
        models.Company.hasMany(models.Employee);
    };

    return Company;
};
