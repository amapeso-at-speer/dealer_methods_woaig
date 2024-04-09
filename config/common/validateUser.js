const jwt = require('jsonwebtoken');
const Constants = require('../constants');
const commonFunc = require('../commons');
// const { logger } = require('../common/log/logger');

const validateUser = (req, res, next) => {
	let tokenID = req.headers['x-access-token'];
	jwt.verify(tokenID, res.app.get(process.env.APP_SECRET_KEY), (err, decoded) => {
		if (err || commonFunc.isNullOrUndefined(decoded.id)) {
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
			req.body.userRole = decoded.userRole;
			next();
		}
	});
};

module.exports = validateUser;
