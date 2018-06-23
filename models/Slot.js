'use strict';

module.exports = (sequelize, DataTypes) => {
    var Slot = sequelize.define('Slot', {
        begin: DataTypes.TIME,
        end: DataTypes.TIME,
        name: DataTypes.STRING,
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
        tableName: 'slot',
    });

    Slot.associate = function (models) {
        models.Slot.belongsTo(models.EmployeeCategory, {
            as: 'category',
            foreignKey: 'categoryId'
        });
        models.Slot.belongsToMany(models.Employee, {
            as: 'employeesDefault',
            through: 'EmployeeDefaultSlot'
        });
    };

    return Slot;
};
