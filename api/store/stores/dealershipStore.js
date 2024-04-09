const mongoose = require('mongoose');
const Dealership = mongoose.model('Dealership');

module.exports = {
	async updateOneDealership(criteria, updateObject, options) {
		try {
			return await Dealership.updateOne(criteria, updateObject, options);
		} catch (error) {
			throw { error, criteria, updateObject, options };
		}
	},

	async saveDealership(dealership) {
		try {
			return await dealership.save();
		} catch (error) {
			throw { error, dealership };
		}
	},

	async createDealership() {
		try {
			return await this.saveDealership(new Dealership());
		} catch (error) {
			throw { error };
		}
	},

	async findDealerships(criteria, projection, options) {
		try {
			return await Dealership.find(criteria, projection, options);
		} catch (error) {
			throw { error, criteria, projection, options };
		}
	},

	async findOneDealershipAndUpdate(criteria, updateObject, options, callback) {
		try {
			return await Dealership.findOneAndUpdate(criteria, updateObject, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findOneDealership(criteria, projection) {
		try {
			return await Dealership.findOne(criteria, projection);
		} catch (error) {
			throw { error, criteria };
		}
	}
};
