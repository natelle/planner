'use strict';

module.exports = (sequelize, DataTypes) => {
    var Planning = sequelize.define('Planning', {
        day: DataTypes.DATE,
        type: DataTypes.STRING
    }, {
        tableName: 'planning',
    });

    Planning.associate = function (models) {
        models.Planning.belongsToMany(models.Availability, {through: 'PlanningAvailability'});
    };

    return Planning;
};
