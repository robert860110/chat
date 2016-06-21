var bcrypt = require('bcrypt');
var _ = require('underscore');
var cryptojs = require('crypto-js');

module.exports = function(sequelize, DataTypes) {
    var password = sequelize.define('password', {
        mdn: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isUsed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: false
        },
        password: {
            type: DataTypes.VIRTUAL,
            allowNull: false,

            set: function(value) {
                var salt = bcrypt.genSaltSync(10);
                var hashedPassword = bcrypt.hashSync(value, salt);

                this.setDataValue('password', value);
                this.setDataValue('password_hash', hashedPassword);
            }
        }
    }, {
        classMethods: {
            authenticate: function(body) {
                return new Promise(function(resolve, reject) {
                    if (typeof body.mdn !== 'string' || typeof body.password !== 'string') {
                        return reject();
                    }

                    password.findOne({
                        where: {
                            mdn: body.mdn
                        }
                    }).then(function(password) {

                        if (!password || !bcrypt.compareSync(body.password, password.get('password_hash'))) {
                            console.log(body.password);
                            console.log(password.password_hash);
                            return reject();
                        }
                        resolve(password);
                    }, function(e) {
                        reject();
                    });
                });
            }
        },
        instanceMethods: {
            toPublicJSON: function() {
                var json = this.toJSON();
                return _.pick(json, 'password_hash', 'mdn', 'createdAt', 'updatedAt');
            },
        }
    });

    return password;
};
