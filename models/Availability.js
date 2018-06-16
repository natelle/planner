'use strict';

module.exports = (sequelize, DataTypes) => {
    var Availability = sequelize.define('Availability', {
        day: DataTypes.DATE,
        type: DataTypes.STRING
    }, {
        tableName: 'availability',
    });

    Availability.associate = function (models) {
        models.Availability.belongsTo(models.Employee, {
            onDelete: "CASCADE",
            foreignKey: {
                allowNull: false
            }
        });
        models.Availability.belongsTo(models.Slot);
        models.Availability.belongsToMany(models.Planning, {through: 'PlanningAvailability'});
    };

    return Availability;
};
