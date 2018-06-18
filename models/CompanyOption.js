'use strict';
module.exports = (sequelize, DataTypes) => {
    var CompanyOptions = sequelize.define('CompanyOptions', {
        name: DataTypes.STRING,

    }, {
        tableName: 'companyoptions'
    });

    CompanyOptions.associate = function(models) {
        models.CompanyOptions.hasMany(models.CompanyOptionsDay, {as: "days"});
    };

    return CompanyOptions;
};
