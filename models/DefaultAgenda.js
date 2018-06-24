'use strict';
module.exports = (sequelize, DataTypes) => {
    var DefaultAgenda = sequelize.define('DefaultAgenda', {
        day: DataTypes.TINYINT,
        number: DataTypes.SMALLINT
    }, {
        tableName: 'defaultagenda'
    });

    DefaultAgenda.associate = function(models) {
        models.DefaultAgenda.belongsTo(models.Slot, {
            as: 'slot',
            foreignKey: 'slotId'
        });
    };

    return DefaultAgenda;
};
