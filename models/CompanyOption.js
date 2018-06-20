'use strict';
module.exports = (sequelize, DataTypes) => {
    var CompanyOptions = sequelize.define('CompanyOptions', {
    }, {
        tableName: 'companyoptions'
    });

    CompanyOptions.associate = function(models) {

    };

    return CompanyOptions;
};
