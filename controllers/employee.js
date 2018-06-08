module.exports = function(router, db) {
    router.get('/employee/add', function(req, res) {
        res.render('employee/add.ejs');
    });

    router.post('/employee/add', function(req, res) {
        db.Employee.create({
            firstName: req.body.firstName,
            lastName: req.body.lastName
        }).then(employee => {
            // let's assume the default of isAdmin is false:
            console.log(employee.firstName + " " + employee.lastName + "created")
            res.end(employee.firstName + " " + employee.lastName + " created");
        });
    });

    router.get('/employee/:id/update', function(req, res) {
        var id = req.params.id;

        db.Employee.findById(id).then(employee => {
            console.log(JSON.stringify(employee));
            res.render('employee/update.ejs', {employee: employee});
        });
    });

    router.post('/employee/:id/update', function(req, res) {
        db.Employee.update({
            firstName: req.body.firstName,
            lastName: req.body.lastName
        }).then(employee => {
            // let's assume the default of isAdmin is false:
            console.log(employee.firstName + " " + employee.lastName + "updated")
            res.end(employee.firstName + " " + employee.lastName + " updated");
        });
    });

    return router;
};
