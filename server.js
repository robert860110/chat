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
var session = require('express-session');
var twilio = require('twilio');

var twilioClient = new twilio.RestClient('AC9c68ea35aee62e08292acd2bcfcf49b6', '938c9c574f9939b1736da9b1a3345c3c');
var app = express();
var PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
    secret: 'VERIZONSUCKS'
}));

app.use(function(req, res, next) {
    var err = req.session.error;
    var msg = req.session.success;
    delete req.session.error;
    delete req.session.success;
    res.locals.message = '';
    if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
    if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
    next();
});

// Routing
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.sendFile('index.html');
});

app.get('/login', function(req, res) {
    res.sendFile('index.html');
});

app.get('/chat', middleware.requireAuthentication, function(req, res) {
    res.sendFile('chat.html');
});


app.post('/sendCode', function(req, res) {

    var body = _.pick(req.body, 'mdn');

    if (body.hasOwnProperty('mdn')) {
        var password = Math.floor(100000 + Math.random() * 900000);
        // console.log(password);

        var pwInstance = {
            password: password.toString(),
            mdn: body.mdn.toString()
        };

        db.password.findOne({
            where: {
                mdn: body.mdn
            }
        }).then(function(password) {

            if (password) {
                password.update(pwInstance).then(function(password) {
                    twilioClient.sms.messages.create({
                        to: body.mdn,
                        from: '+1 408-359-4157',
                        body: 'Your confirmation code is:' + pwInstance.password + '. (Valid for 10 mins)'
                    }, function(error, message) {
                        if (!error) {
                            res.json(message);
                        } else {
                            return res.status(400).json(error);
                        }
                    });
                }, function(error) {
                    res.status(400).json(error);
                });
            } else {
                db.password.create(pwInstance).then(function(password) {
                    twilioClient.sms.messages.create({
                        to: body.mdn,
                        from: '+1 408-359-4157',
                        body: 'Your confirmation code is:' + pwInstance.password + '. (Valid for 10 mins)'
                    }, function(error, message) {
                        if (!error) {
                            res.json(message);
                        } else {
                            return res.status(400).json(error);
                        }
                    });
                }, function(error) {
                    return res.status(400).json(error);
                });
            }

        }, function(error) {
            return res.status(400).json(error);
        });
    }
});

// Create a new user account
app.post('/users', function(req, res) {
    var body = _.pick(req.body, 'email', 'mdn', 'password');
    console.log('body: ' + JSON.stringify(body));

    db.password.authenticate(body).then(function(password) {
        return db.user.create({
            email: body.email,
            mdn: body.mdn
        });
    }).then(function(user) {
        res.json(user.toPublicJSON());
    }).catch(function(error) {
        res.status(401).json(error);
    });
});

// POST /users/login
app.post('/users/login', function(req, res) {

    var body = _.pick(req.body, 'mdn', 'password');



    db.password.authenticate(body).then(function(password) {
        return db.user.findByMdn(body.mdn);
    }).then(function(user) {

        req.session.regenerate(function() {
            // Store the user's primary key
            // in the session store to be retrieved,
            // or in this case the entire user object
            req.session.user = user;
            req.session.success = 'Authenticated as ' + user.mdn + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
            res.redirect('/chat');
        });

        //res.json(user.toPublicJSON());
    }).catch(function(error) {
        req.session.error = 'Authentication failed, please check your username and password.';
        res.status(401).json(error);
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
