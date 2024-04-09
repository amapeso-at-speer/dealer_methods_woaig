const mongoose = require('mongoose');
const moment = require('moment');
const mtz = require('moment-timezone');
const Constants = require('../../config/constants');
// const { logger } = require('../../config/common/log/logger');

const BusinessHours = mongoose.model('BusinessHours');

exports.getBusinessHours = (params) => {
	BusinessHours.findOne(params)
		.then(businessHours => {
			if(businessHours == null) {
				return ({businessHours: 'not set'});
			}
			return businessHours;
		})
		.catch(err => {
			console.error({err, params});
			// logger.error({err, params});
		});
};