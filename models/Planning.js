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

    Planning.prototype.getCategoryId = function() {
        for(var presence of this.presences) {
            return presence.slot.categoryId;
        }

        return false;
    }

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

        for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
            if(typeof organisedPresences[d] === 'undefined') {
                organisedPresences[d] = {};
            }
        }

        this.presences = organisedPresences;
    }

    return Planning;
};
