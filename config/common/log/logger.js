const winston = require('winston');
require('winston-daily-rotate-file');

const weeklyErrorTransport = new (winston.transports.DailyRotateFile)({
	filename: '%DATE%.log',
	datePattern: 'YYYY-w',
	dirname: './logs/error',
	maxSize: '20m',
	maxFiles: '14d',
	level: 'error'
});

const weeklyCombinedTransport = new (winston.transports.DailyRotateFile)({
	filename: '%DATE%.log',
	datePattern: 'YYYY-w',
	dirname: './logs/combined',
	maxSize: '20m',
	maxFiles: '14d',
});

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.prettyPrint(),
	transports: [
		weeklyErrorTransport,
		weeklyCombinedTransport,
	]
});

if (process.env.LOGGER_MODE !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.prettyPrint()
	}));
}

module.exports = {
	logger: logger
};