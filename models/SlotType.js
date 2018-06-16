'use strict';

module.exports = (sequelize, DataTypes) => {
    var SlotType = sequelize.define('SlotType', {
        begin: DataTypes.TIME,
        end: DataTypes.TIME,
        name: DataTypes.STRING,
        order: DataTypes.SMALLINT
    }, {
        tableName: 'slottype',
    });

    SlotType.associate = function (models) {
        models.SlotType.hasMany(models.Slot);
        models.SlotType.belongsToMany(models.EmployeeCategory, {
            through: 'EmployeeCategorySlotType',
            as: 'categories'
        });
    };

    return SlotType;
};
