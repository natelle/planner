'use strict';
module.exports = (sequelize, DataTypes) => {
    var Employee = sequelize.define('Employee', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING,
        category: DataTypes.STRING
    }, {
        tableName: 'employee'
    });

    Employee.associate = function(models) {
        models.Employee.hasMany(models.EmployeePossibility);
    };

    return Employee;
};
