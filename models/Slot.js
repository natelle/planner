'use strict';

module.exports = (sequelize, DataTypes) => {
    var Slot = sequelize.define('Slot', {
        begin: DataTypes.DATE,
        end: DataTypes.DATE
    }, {
        tableName: 'slot',
    });

    Slot.associate = function (models) {
        models.Slot.hasMany(models.Availability);
        models.Slot.hasMany(models.Agenda);
        models.Slot.belongsTo(models.SlotType);
    };

    return Slot;
};
