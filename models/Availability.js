'use strict';

module.exports = (sequelize, DataTypes) => {
    var Availability = sequelize.define('Availability', {
        day: DataTypes.DATE
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
        models.Availability.belongsToMany(models.Planning, {through: 'PlanningAvailability'});
    };

    return Availability;
};
