'use strict';
module.exports = (sequelize, DataTypes) => {
    var EmployeeCategory = sequelize.define('EmployeeCategory', {
        name: DataTypes.STRING,
        interval: {
            type: DataTypes.STRING,
            get() {
                var match;
                var interval = null;

                if((match = this.getDataValue('interval').match(/(\d+)([dwm])/))) {
                    interval = { number: match[1], type: match[2] };
                }

                return interval;
            },
            set(value) {
                if(value.number.match(/^\d+$/) && value.type.match(/^[dwm]$/)) {
                    this.setDataValue('interval', value.number + value.type);
                } else {
                    throw "Uncorrect value for category.interval."
                }
            }
        }
    }, {
        tableName: 'employeecategory'
    });

    EmployeeCategory.associate = function(models) {
        models.EmployeeCategory.hasMany(models.Employee);
        models.EmployeeCategory.hasMany(models.Slot);
    };

    return EmployeeCategory;
};
