'use strict';

module.exports = (sequelize, DataTypes) => {
    var Agenda = sequelize.define('Agenda', {
        day: DataTypes.DATE,
        type: DataTypes.STRING,
        number: DataTypes.SMALLINT
    }, {
        tableName: 'agenda',
    });

    Agenda.associate = function (models) {
        models.Agenda.belongsTo(models.Slot);
    };

    return Agenda;
};
