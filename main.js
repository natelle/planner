var express = require('express');

var app = express();
var bodyParser = require('body-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

const Sequelize = require('sequelize');
const sequelize = new Sequelize('planner', 'root', '', {
    host: 'localhost',
    dialect: 'mysql',
    operatorsAliases: false
});

sequelize
.authenticate()
.then(() => {
    console.log('Connection has been established successfully.');
})
.catch(err => {
    console.error('Unable to connect to the database:', err);
});

const Personnel = sequelize.define('personnel', {
    first_name: {
        type: Sequelize.STRING
    },
    last_name: {
        type: Sequelize.STRING
    }
});

app.get('/personnel/add', function(req, res) {
    res.render('personnel/add.ejs');
});

app.post('/personnel/add', function(req, res) {
    Personnel.sync({force: false}).then(() => {
        // Table created
        return Personnel.create({
            first_name: req.body.first_name,
            last_name: req.body.last_name
        });
    });
    res.end('Utilisateur ' + req.body.first_name + " " + req.body.last_name);
});

app.listen(8080);
console.log("main running...");





// force: true will drop the table if it already exists
