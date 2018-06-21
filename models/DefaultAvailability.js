'use strict';
module.exports = (sequelize, DataTypes) => {
    var DefaultAvailability = sequelize.define('DefaultAvailability', {
        day: DataTypes.TINYINT
    }, {
        tableName: 'defaultavailability'
    });

    DefaultAvailability.associate = function(models) {
        models.DefaultAvailability.belongsTo(models.SlotType, {
            as: 'slotType',
            foreignKey: 'slotTypeId'
        });
        models.DefaultAvailability.belongsTo(models.Employee);
    };

    return DefaultAvailability;
};
