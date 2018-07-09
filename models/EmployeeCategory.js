'use strict';
module.exports = (sequelize, DataTypes) => {
    var EmployeeCategory = sequelize.define('EmployeeCategory', {
        name: DataTypes.STRING,
        interval: DataTypes.STRING
    }, {
        tableName: 'employeecategory'
    });

    EmployeeCategory.associate = function(models) {
        models.EmployeeCategory.hasMany(models.Employee);
        models.EmployeeCategory.hasMany(models.Slot);
    };

    return EmployeeCategory;
};
