'use strict';

module.exports = (sequelize, DataTypes) => {
    var Planning = sequelize.define('Planning', {
        firstDate: DataTypes.DATE,
        lastDate: DataTypes.DATE,
        temp: DataTypes.BOOLEAN
    }, {
        tableName: 'planning',
    });

    Planning.associate = function (models) {
        models.Planning.hasMany(models.Availability, {as: 'presences'});
    };

    Planning.prototype.organisePresences = function() {
        var organisedPresences = {};

        for(var presence of this.presences) {
            var day = presence.day;

            if(typeof organisedPresences[day] === "undefined") {
                organisedPresences[day] = {};
            }

            var slotId = presence.slot.id;

            if(typeof organisedPresences[day][slotId] === "undefined") {
                organisedPresences[day][slotId] = [presence];
            } else {
                organisedPresences[day][slotId].push(presence);
            }
        }

        this.presences = organisedPresences;
    }

    return Planning;
};
