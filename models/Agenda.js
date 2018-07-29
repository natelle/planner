'use strict';

module.exports = (sequelize, DataTypes) => {
    var Agenda = sequelize.define('Agenda', {
        day: DataTypes.DATE,
        number: DataTypes.SMALLINT,
        virtual: DataTypes.BOOLEAN
    }, {
        tableName: 'agenda',
    });

    Agenda.associate = function (models) {
        models.Agenda.belongsTo(models.Slot, {
            as: 'slot',
            foreignKey: 'slotId'
        });
    };

    return Agenda;
};
