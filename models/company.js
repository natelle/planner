'use strict';

module.exports = (sequelize, DataTypes) => {
    var Company = sequelize.define('Company', {
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        phone: DataTypes.STRING,

        defaultDay0: DataTypes.STRING,
        defaultDay1: DataTypes.STRING,
        defaultDay2: DataTypes.STRING,
        defaultDay3: DataTypes.STRING,
        defaultDay4: DataTypes.STRING,
        defaultDay5: DataTypes.STRING,
        defaultDay6: DataTypes.STRING
    }, {
        tableName: 'company'
    });

    return Company;
};
