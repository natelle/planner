'use strict';

module.exports = (sequelize, DataTypes) => {
    var Planning = sequelize.define('Planning', {
        day: DataTypes.DATE,
        type: DataTypes.STRING
    }, {
        tableName: 'planning',
    });

    Planning.associate = function (models) {
        models.Planning.belongsTo(models.Employee, {
            onDelete: "CASCADE",
            foreignKey: {
                allowNull: false
            }
        });
    };

    return Planning;
};
