module.exports = function(router, db) {
    router.get('/employee/add', function(req, res) {
        res.render('employee/add.ejs');
    });

    router.post('/employee/add', function(req, res) {
        db.Employee.sync({force: false}).then(() => {
            // Table created
            return db.Employee.create({
                firstName: req.body.firstName,
                lastName: req.body.lastName
            });
        });
        res.end('Utilisateur ' + req.body.firstName + " " + req.body.lastName);
    });

    router.get('/employee/:id/update', function(req, res) {
        var id = req.params.id;

        db.Employee.findById(id).then(employee => {
            console.log(JSON.stringify(employee));
            res.render('employee/update.ejs', {employee: employee});
        });
    });

    return router;
};
