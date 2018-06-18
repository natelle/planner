'use strict';
module.exports = (sequelize, DataTypes) => {
    var CompanyOptionsDay = sequelize.define('CompanyOptionsDay', {
        number: DataTypes.TINYINT
    }, {
        tableName: 'companyoptionsday'
    });

    CompanyOptionsDay.associate = function(models) {
        models.CompanyOptionsDay.hasMany(models.SlotType);
        models.CompanyOptionsDay.belongsTo(models.EmployeeCategory, {as: "category", foreignKey: 'employeecategoryid'})
        models.CompanyOptionsDay.belongsTo(models.CompanyOptions, {foreignKey: 'companyoptionsid'})
    };

    return CompanyOptionsDay;
};
