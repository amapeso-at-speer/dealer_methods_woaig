const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Constants = require('../config/constants');
const ExpiredTokens = mongoose.model('ExpiredTokens');

exports.validateUser = function validateUser(req, res, next) {
	// jwt.verify(req.headers['x-access-token'], req.app.get('secretKey'), (err, decoded) => {
	let tokenID = req.headers['x-access-token'];
	jwt.verify(tokenID, res.app.get(Constants.SERVER.APP_SECRET_KEY), (err, decoded) => {
		if (err) {
			res.json(
				{
					status: 'error',
					err: err,
					message: err.message,
					resolve: Constants.APP_MESSAGE.REAUTHENTICATE_MESSAGE
				}
			);
		} else {
			req.body.userId = decoded.id;
			//TO REMOVE VALIDITY COMMENT ALL BELOW CODE AND UNCOMMENT NEXT
			ExpiredTokens.find({id: tokenID})
				.then(resolve => {
					if (resolve.length == 0) {
						next();
					}
					res.send({error: Constants.APP_MESSAGE.REAUTHENTICATE_MESSAGE});
				})
				.catch(reject => {
					res.send({error: Constants.APP_MESSAGE.REAUTHENTICATE_MESSAGE});
				});
			// next();
		}
	});
};
exports.checkTokenValidity = function (req, res, next) {
	let tokenID = req.headers['x-access-token'];
	ExpiredTokens.find({id: tokenID})
		.then(resolve => {
			console.log(resolve.length);
			if (resolve.length == 0) {
				next();
			}
			res.send({error: Constants.APP_MESSAGE.REAUTHENTICATE_MESSAGE});
		})
		.catch(reject => {
			res.send({error: Constants.APP_MESSAGE.REAUTHENTICATE_MESSAGE});
		});
};
