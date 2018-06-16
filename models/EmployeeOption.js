'use strict';
module.exports = (sequelize, DataTypes) => {
    var EmployeeOption = sequelize.define('EmployeeOption', {
        name: DataTypes.STRING
    }, {
        tableName: 'employeeoption'
    });

    EmployeeOption.associate = function(models) {
        models.EmployeeOption.hasOne(models.Employee);
    };

    return EmployeeOption;
};
