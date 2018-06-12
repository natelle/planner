'use strict';

module.exports = (sequelize, DataTypes) => {
    var Agenda = sequelize.define('Agenda', {
        day: DataTypes.DATE,
        type: DataTypes.STRING
    }, {
        tableName: 'agenda',
    });

    return Agenda;
};
