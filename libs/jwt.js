const jwt = require('jsonwebtoken');
const secretKey = "MySecretKey";

module.exports = {
    sign(payload) {
        return jwt.sign(payload, secretKey, {
            expiresIn: '1d'
        });
    },

    verify(token) {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secretKey, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });
    }
};