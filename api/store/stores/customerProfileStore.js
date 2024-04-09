const mongoose = require('mongoose');
const CustomerProfile = mongoose.model('CustomerProfile');

module.exports = {
	async findOneCustomer(criteria, projection, options, callback) {
		try {
			return await CustomerProfile.findOne(criteria, projection, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async updateOneCustomer(criteria, updateObject, options, callback) {
		try {
			return await CustomerProfile.updateOne(criteria, updateObject, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findCustomers(criteria, projection, options) {
		try {
			return await CustomerProfile.find(criteria, projection, options);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async saveCustomer(customer) {
		try {
			return await customer.save();
		} catch (error) {
			throw { error, customer };
		}
	},

	async createCustomer(customerData, createdById) {
		try {
			let customer = new CustomerProfile(customerData);
			customer.createdBy = createdById;

			return await this.saveCustomer(customer);
		} catch (error) {
			throw { error, customerData };
		}
	},

	async findOneCustomerAndUpdate(criteria, updateObject, options, callback) {
		try {
			return await CustomerProfile.findOneAndUpdate(criteria, updateObject, options, callback);
		} catch (error) {
			throw { error, criteria};
		}
	},

	async customerFuzzySearch(searchTerm, callback) {
		try {
			return await CustomerProfile.fuzzySearch(searchTerm, callback);
		} catch (error) {
			throw { error, searchTerm };
		}
	},

	async customerFind300(callback) {
		try {
			return await CustomerProfile.find({isDeleted: {$ne: true}}).limit(300).exec(callback);
		} catch (error) {
			throw { error };
		}
	},

	async findCustomerById(id, projection, options, callback) {
		try {
			const customer = await CustomerProfile.findById(id, projection, options);

			if(callback) {
				return callback(null, customer);
			}
			return customer;
		} catch (error) {
			if (callback) {
				return callback(error, null);
			}
			throw { error, id };
		}
	}
};
