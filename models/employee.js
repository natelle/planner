'use strict';
module.exports = (sequelize, DataTypes) => {
    var Employee = sequelize.define('Employee', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        category: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING,

        defaultMon: DataTypes.STRING,
        defaultTue: DataTypes.STRING,
        defaultWed: DataTypes.STRING,
        defaultThu: DataTypes.STRING,
        defaultFri: DataTypes.STRING,
        defaultSat: DataTypes.STRING,
        defaultSun: DataTypes.STRING
    }, {
        tableName: 'employee'
    });

    Employee.associate = function(models) {
        models.Employee.hasMany(models.EmployeeAvailability);
    };

    return Employee;
};
