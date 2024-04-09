const APIAuthService = require('../../api/util/APIAuthService');

let authorize = async (req, res, next) => {

	if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
		return res.status(401).json({ err: 'http://tinyurl.com/4m6eoes' });
	}

	const base64Credentials =  req.headers.authorization.split(' ')[1];
    
	const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
	const [username, password] = credentials.split(':');
	const user = await APIAuthService.authenticate({ username, password });
	if (!user) {
		return res.status(401).json({ err: 'http://tinyurl.com/4m6eoes' });
	}

	next();
};

module.exports = authorize;
