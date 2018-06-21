'use strict';
module.exports = (sequelize, DataTypes) => {
    var Employee = sequelize.define('Employee', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING,

        // defaultNumber: DataTypes.FLOAT,
        // defaultDay0: DataTypes.STRING,
        // defaultDay1: DataTypes.STRING,
        // defaultDay2: DataTypes.STRING,
        // defaultDay3: DataTypes.STRING,
        // defaultDay4: DataTypes.STRING,
        // defaultDay5: DataTypes.STRING,
        // defaultDay6: DataTypes.STRING
    }, {
        tableName: 'employee'
    });

    Employee.prototype.getName = function() {
        return (this.firstName + ' ' + this.lastName);
    };

    Employee.prototype.getFirstNameInitials = function() {
        return this.firstName.replace(/(\w)\w*(\W|$)/g, "$1.$2");
    };

    Employee.prototype.getLastNameInitials = function() {
        return this.lastName.replace(/(\w)\w*(\W|$)/g, "$1.$2");
    };

    Employee.prototype.getNameInitials = function() {
        return this.getFirstNameInitials + ' ' + this.getLastNameInitials();
    };

    Employee.prototype.getShortName = function() {
        return this.getFirstNameInitials() + ' ' + this.lastName;
    };

    Employee.associate = function(models) {
        models.Employee.hasMany(models.Availability);
        models.Employee.belongsTo(models.EmployeeCategory, {as: 'category', foreignKey: 'categoryId'});
        models.Employee.hasMany(models.DefaultAvailability, {as: 'defaultAvailabilities'});
    };

    return Employee;
};
