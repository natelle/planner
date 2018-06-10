var app = require('./controllers/app');
var http = require('http');
var models = require('./models');

var port = '8080';
app.set('port', port);

var server = http.createServer(app);

models.sequelize.sync().then(function() {
  /**
   * Listen on provided port, on all network interfaces.
   */
  server.listen(port, function() {
    console.log('Express server listening on port ' + server.address().port);
  });
});
