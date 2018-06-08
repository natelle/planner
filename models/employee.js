module.exports = function(sequelize, Sequelize) {
    return sequelize.define('employee', {
        firstName: {
            type: Sequelize.STRING
        },
        lastName: {
            type: Sequelize.STRING
        }
    }, {
        tableName: 'employee'
    });
};
