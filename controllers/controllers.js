module.exports = function(express, db) {
    var router = express.Router();

    router = require("./employee.js")(router, db);

    return router;
};
