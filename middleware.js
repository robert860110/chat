var cryptojs = require('crypto-js');
var session = require('express-session');

module.exports = function(db) {

    return {
        requireAuthentication: function(req, res, next) {
            // var token = req.get('Auth') || '';

            // db.token.findOne({
            //     where: {
            //         tokenHash: cryptojs.MD5(token).toString()
            //     }
            // }).then(function(tokenInstance) {
            //     if (!tokenInstance) {
            //         throw new Error();
            //     }

            //     req.token = tokenInstance;
            //     return db.user.findByToken(token);
            // }).then(function(user) {
            //     req.user = user;
            //     next();
            // }).catch(function() {
            //     res.status(401).send();
            // });

            if (req.session.user) {
                next();
            } else {
                req.session.error = 'Access denied!';
                res.redirect('/login');
            }
        }
    };

};
