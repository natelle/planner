'use strict';

module.exports = (sequelize, DataTypes) => {
    var Company = sequelize.define('Company', {
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING,

        defaultNumber: DataTypes.SMALLINT
    }, {
        tableName: 'company'
    });

    Company.associate = function(models) {
    };

    return Company;
};
