'use strict';
module.exports = (sequelize, DataTypes) => {
    var DefaultAvailability = sequelize.define('DefaultAvailability', {
        day: DataTypes.TINYINT,
        mandatory: DataTypes.BOOLEAN
    }, {
        tableName: 'defaultavailability'
    });

    DefaultAvailability.associate = function(models) {
        models.DefaultAvailability.belongsTo(models.Slot, {
            as: 'slot',
            foreignKey: 'slotId'
        });
        models.DefaultAvailability.belongsTo(models.Employee);
    };

    return DefaultAvailability;
};
