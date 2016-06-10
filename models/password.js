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
        instanceMethods: {
            toPublicJSON: function() {
                var json = this.toJSON();
                return _.pick(json, 'password_hash', 'mdn', 'createdAt', 'updatedAt');
            },
        }
    });

    return password;
};
