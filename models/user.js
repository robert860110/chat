var _ = require('underscore');

module.exports = function(sequelize, DataTypes) {
    var user = sequelize.define('user', {
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        mdn: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        }
    }, {
        hooks: {
            beforeValidate: function(user, options) {
                // user.email
                if (typeof user.email === 'string') {
                    user.email = user.email.toLowerCase();
                }
            }
        },

        classMethods: {

            findByMdn: function(mdn) {
                return new Promise(function(resolve, reject) {
                    try {
                        user.findOne({
                            where: {
                                mdn: mdn
                            }
                        }).then(function(user) {
                            if (user) {
                                resolve(user);
                            } else reject();
                        }, function(error) {
                            reject(error);
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        },


        instanceMethods: {
            toPublicJSON: function() {
                var json = this.toJSON();
                return _.pick(json, 'mdn', 'email', 'createdAt', 'updatedAt');
            },
        }
    });
    return user;
};
