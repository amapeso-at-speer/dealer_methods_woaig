exports.env = {
	DEV: 'dev',
	LIVE: 'live',
	LOCAL: 'local'
};

exports.SERVER = {
	env: 'env',
	APP_NAME: 'DMAPI',
	PORTS: {
		EXPRESS: 8080
	},
	TOKEN_EXPIRATION_IN_MINUTES: 600,
	JWT_DISCARD_TIME: '8h',
	SENDER_EMAIL: 'mmozaffari@dealermethods.com',
	AWS_EMAIL_CONFIGSET: 'DMEmailService',
	DEBUGGING: true, //change to false before pushing to prod
	NEWACCOUNTGOOGLESHEET: process.env.GOOGLE_SHEET_ACCOUNT_REQUEST,
	TRACCAR_SERVER_BASE: 'http://15.223.126.206:8082/api/',
	GUIDEPOINT_BASE: 'http://guidepointsystems.com:80/api2/',
	TEAM_EMAIL: 'tholton@dealermethods.com',
	PAGE_SIZE: 20
};

exports.APP_MESSAGE = {
	INCORRECT_EMAIL_ERROR: ' This email ID is not registered with us.',
	JWT_DISCARD_MESSAGE: ' The user has been successfully logged out',
	REAUTHENTICATE_MESSAGE: ' The user has been logged out, kindly reauthenticate',
	NOT_FOUND_ERROR: ' Error 404: Page not found',
	INVALID_CREDENTIALS: ' Please enter valid credentials',
	INCORRECT_PASSWORD_ERROR: ' Password is incorrect',
	ACCOUNT_FROZEN: ' This account is currently frozen. Please contact your administrator to reinstate it.'
};


