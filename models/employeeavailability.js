'use strict';

module.exports = (sequelize, DataTypes) => {
    var EmployeeAvailability = sequelize.define('EmployeeAvailability', {
        day: DataTypes.DATE,
        type: DataTypes.STRING
    }, {
        tableName: 'availability',
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
