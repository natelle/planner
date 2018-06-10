'use strict';

module.exports = (sequelize, DataTypes) => {
    var EmployeePossibility = sequelize.define('EmployeePossibility', {
        day: DataTypes.DATE,
        type: DataTypes.STRING,
        presence: DataTypes.BOOLEAN
    }, {
        tableName: 'employeepossibility',
    });

    EmployeePossibility.associate = function (models) {
        models.EmployeePossibility.belongsTo(models.Employee, {
            onDelete: "CASCADE",
            foreignKey: {
                allowNull: false
            }
        });
    };

    return EmployeePossibility;
};
