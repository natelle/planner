'use strict';
module.exports = (sequelize, DataTypes) => {
    var CompanyOption = sequelize.define('CompanyOption', {
        name: DataTypes.STRING
    }, {
        tableName: 'companyoption'
    });

    CompanyOption.associate = function(models) {
        models.CompanyOption.hasOne(models.Company);
    };

    return CompanyOption;
};
