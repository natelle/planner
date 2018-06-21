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

                if(days.includes(0)) {
                    days.shift();
                    days.push(0);
                }

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
        models.SlotType.belongsTo(models.EmployeeCategory, {
            as: 'category',
            foreignKey: 'categoryId'
        });
        models.SlotType.belongsToMany(models.Employee, {
            as: 'employeesDefault',
            through: 'EmployeeDefaultSlotType'
        });
    };

    return SlotType;
};
