const mongoose = require('mongoose');
const DealershipHoliday = mongoose.model('DealershipHoliday');

module.exports = {
	async saveDealershipHoliday(dealershipHoliday) {
		try {
			return await dealershipHoliday.save();
		} catch (error) {
			throw { error, dealershipHoliday };
		}
	},

	async createDealershipHoliday(dealershipID) {
		try {
			return await this.saveDealershipHoliday(
				new DealershipHoliday({
					dealershipID, holidays: []
				})
			);
		} catch (error) {
			throw { error, dealershipID };
		}
	},

	async findOneDealershipHoliday(criteria, projection, options, callback) {
		try {
			return await DealershipHoliday.findOne(criteria, projection, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findOneDealershipHolidayAndUpdate(criteria, updateObject, options, callback) {
		try {
			return await DealershipHoliday.findOneAndUpdate(criteria, updateObject, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findDealershipHolidays(criteria, projection, options) {
		try {
			return await DealershipHoliday.find(criteria, projection, options);
		} catch (error) {
			throw { error, criteria };
		}
	},
};