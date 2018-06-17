'use strict';

module.exports = (sequelize, DataTypes) => {
    var SlotType = sequelize.define('SlotType', {
        begin: DataTypes.TIME,
        end: DataTypes.TIME,
        name: DataTypes.STRING,
        order: DataTypes.SMALLINT,
        days: {
            type: DataTypes.STRING,
            get() {
                var days = this.getDataValue('days').split('').filter(function(d, index, array) {
                    return array.indexOf(d) === index;
                });
                days = days.map(d => parseInt(d)).sort();

                return days;
            },
            set(value) {
                var days = value.sort().filter(function(d, index, array) {
                    return array.indexOf(d) === index;
                });

                this.setDataValue('days', days.join(""));
            }
        }
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
