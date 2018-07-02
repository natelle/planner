'use strict';

module.exports = (sequelize, DataTypes) => {
    var Planning = sequelize.define('Planning', {
        firstDate: DataTypes.DATE,
        lastDate: DataTypes.DATE,
        validated: DataTypes.BOOLEAN
    }, {
        tableName: 'planning',
    });

    Planning.associate = function (models) {
        models.Planning.hasMany(models.Availability, {
            as: 'presences',
            onUpdate: 'cascade',
            onDelete: 'cascade'
        });
        models.Planning.belongsTo(models.EmployeeCategory, {
            as: 'category',
            foreignKey: 'categoryId'
        });
    };

    Planning.prototype.getCreatedAtFormated = function() {
        var date = this.createdAt;

        return date.getDate() + '/' + (date.getMonth()+1).toString().padStart(2, '0') + '/' + date.getFullYear() +
        ' ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    };

    Planning.prototype.getCategoryId = function() {
        return this.categoryId;
    };

    Planning.prototype.organisePresences = function() {
        var organisedPresences = {};

        for(var presence of this.presences) {
            var day = presence.day.getTime();

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

        for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
            if(typeof organisedPresences[d.getTime()] === 'undefined') {
                organisedPresences[d.getTime()] = {};
            }
        }        

        this.presences = organisedPresences;
    }

    Planning.prototype.organisePresencesByDate = function() {
        var organisedPresences = {};

        for(var presence of this.presences) {
            var day = presence.day.getTime();

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

        console.log(organisedPresences);

        this.presences = organisedPresences;
    }

    return Planning;
};
