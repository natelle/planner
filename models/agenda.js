'use strict';

module.exports = (sequelize, DataTypes) => {
    var Agenda = sequelize.define('Agenda', {
        day: DataTypes.DATE,
        type: DataTypes.STRING,
        number: DataTypes.SMALLINT
    }, {
        tableName: 'agenda',
    });

    return Agenda;
};
