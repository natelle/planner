'use strict';

module.exports = (sequelize, DataTypes) => {
    var Availability = sequelize.define('Availability', {
        day: DataTypes.DATE,
        mandatory: DataTypes.BOOLEAN
    }, {
        tableName: 'availability',
    });

    Availability.associate = function (models) {
        models.Availability.belongsTo(models.Employee, {
            //foreignKey: 'employeeId'
        });
        models.Availability.belongsTo(models.Slot, {
            as: 'slot',
            foreignKey: 'slotId'
        });

        models.Availability.belongsTo(models.Planning);
    };

    return Availability;
};
