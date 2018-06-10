'use strict';

module.exports = (sequelize, DataTypes) => {
    var EmployeeAvailability = sequelize.define('EmployeeAvailability', {
        day: DataTypes.DATE,
        type: DataTypes.STRING,
        presence: DataTypes.BOOLEAN
    }, {
        tableName: 'employeeavailability',
    });

    EmployeeAvailability.associate = function (models) {
        models.EmployeeAvailability.belongsTo(models.Employee, {
            onDelete: "CASCADE",
            foreignKey: {
                allowNull: false
            }
        });
    };

    return EmployeeAvailability;
};
