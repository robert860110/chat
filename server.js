/**
 * server.js
 * chat application login using mobile phone number 
 * @author Guanqun Bao
 * 6-14-2016
 */

var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var db = require('./db.js');
var bcrypt = require('bcrypt');
var middleware = require('./middleware.js')(db);
var twilio = require('twilio');
var twilioClient = new twilio.RestClient('AC9c68ea35aee62e08292acd2bcfcf49b6', '938c9c574f9939b1736da9b1a3345c3c');

var app = express();
var PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Routing
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.send('Todo API Root');
});

// GET /todos?completed=false&q=work
app.get('/todos', middleware.requireAuthentication, function(req, res) {
    var query = req.query;
    var where = {
        userId: req.user.get('id')
    };

    if (query.hasOwnProperty('completed') && query.completed === 'true') {
        where.completed = true;
    } else if (query.hasOwnProperty('completed') && query.completed === 'false') {
        where.completed = false;
    }

    if (query.hasOwnProperty('q') && query.q.length > 0) {
        where.description = {
            $like: '%' + query.q + '%'
        };
    }

    db.todo.findAll({
        where: where
    }).then(function(todos) {
        res.json(todos);
    }, function(e) {
        res.status(500).send();
    });
});

// GET /todos/:id
app.get('/todos/:id', middleware.requireAuthentication, function(req, res) {
    var todoId = parseInt(req.params.id, 10);

    db.todo.findOne({
        where: {
            id: todoId,
            userId: req.user.get('id')
        }
    }).then(function(todo) {
        if (!!todo) {
            res.json(todo.toJSON());
        } else {
            res.status(404).send();
        }
    }, function(e) {
        res.status(500).send();
    });
});

// POST /todos
app.post('/todos', middleware.requireAuthentication, function(req, res) {
    var body = _.pick(req.body, 'description', 'completed');

    db.todo.create(body).then(function(todo) {
        req.user.addTodo(todo).then(function() {
            return todo.reload();
        }).then(function(todo) {
            res.json(todo.toJSON());
        });
    }, function(e) {
        res.status(400).json(e);
    });
});

// DELETE /todos/:id
app.delete('/todos/:id', middleware.requireAuthentication, function(req, res) {
    var todoId = parseInt(req.params.id, 10);

    db.todo.destroy({
        where: {
            id: todoId,
            userId: req.user.get('id')
        }
    }).then(function(rowsDeleted) {
        if (rowsDeleted === 0) {
            res.status(404).json({
                error: 'No todo with id'
            });
        } else {
            res.status(204).send();
        }
    }, function() {
        res.status(500).send();
    });
});

// PUT /todos/:id
app.put('/todos/:id', middleware.requireAuthentication, function(req, res) {
    var todoId = parseInt(req.params.id, 10);
    var body = _.pick(req.body, 'description', 'completed');
    var attributes = {};

    if (body.hasOwnProperty('completed')) {
        attributes.completed = body.completed;
    }

    if (body.hasOwnProperty('description')) {
        attributes.description = body.description;
    }

    db.todo.findOne({
        where: {
            id: todoId,
            userId: req.user.get('id')
        }
    }).then(function(todo) {
        if (todo) {
            todo.update(attributes).then(function(todo) {
                res.json(todo.toJSON());
            }, function(e) {
                res.status(400).json(e);
            });
        } else {
            res.status(404).send();
        }
    }, function() {
        res.status(500).send();
    });
});


app.post('/sendCode', function(req, res) {
    var body = _.pick(req.body, 'mdn', 'email');

    if (body.hasOwnProperty('mdn') && body.hasOwnProperty('email')) {
        var password = Math.floor(100000 + Math.random() * 900000);
        // console.log(password);

        // REST client will handle authentication and response serialzation for you.
        twilioClient.sms.messages.create({
            to: '6506565545',
            from: '+1 408-359-4157',
            body: 'ahoy hoy! Testing Twilio and node.js'
        }, function(error, message) {
            // The HTTP request to Twilio will run asynchronously. This callback
            // function will be called when a response is received from Twilio
            // The "error" variable will contain error information, if any.
            // If the request was successful, this value will be "falsy"
            console.log(error);

            console.log(message);

            if (!error) {
                // The second argument to the callback will contain the information
                // sent back by Twilio for the request. In this case, it is the
                // information about the text messsage you just sent:
                console.log('Success! The SID for this SMS message is:');
                console.log(message.sid);

                console.log('Message sent on:');
                console.log(message.dateCreated);
            } else {
                console.log('Oops! There was an error.');
            }
        });




    } else if (body.hasOwnProperty('mdn') && !body.hasOwnProperty('email')) {
        db.user.findByMdn(body.mdn).then(function(user) {

        }, function(error) {
            res.status(400).send('No record match your phone number, please sign up first');
        });
    }

});

// Create a new user account
app.post('/users', function(req, res) {
    var body = _.pick(req.body, 'email', 'mdn', 'password');
    //console.log('body: ' + JSON.stringify(req.body));

    db.user.create(body).then(function(user) {
        res.json(user.toPublicJSON());
    }, function(e) {
        res.status(400).json(e);
    });
});

// POST /users/login
app.post('/users/login', function(req, res) {
    var body = _.pick(req.body, 'mdn', 'password');
    var userInstance;

    db.user.authenticate(body).then(function(user) {
        var token = user.generateToken('authentication');
        userInstance = user;

        return db.token.create({
            token: token
        });
    }).then(function(tokenInstance) {
        res.header('Auth', tokenInstance.get('token')).json(userInstance.toPublicJSON());
    }).catch(function() {
        res.status(401).send();
    });
});

// DELETE /users/login
app.delete('/users/login', middleware.requireAuthentication, function(req, res) {
    req.token.destroy().then(function() {
        res.status(204).send();
    }).catch(function() {
        res.status(500).send();
    });
});

db.sequelize.sync({ force: true }).then(function() {
    app.listen(PORT, function() {
        console.log('Express listening on port ' + PORT + '!');
    });
});
