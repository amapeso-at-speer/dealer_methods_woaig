const mongoose = require('mongoose');
const User = mongoose.model('User');

module.exports = {
	async findOneUser(criteria, projection, options) {
		try {
			return await User.findOne(criteria, projection, options);
		} catch (error) {
			throw { error, criteria };
		}
	},
	
	async updateOneUser(criteria, updateObject, options) {
		try {
			return await User.updateOne(criteria, updateObject, options);
		} catch (error) {
			throw { error, criteria, updateObject, options };
		}
	},
	
	async deleteOneUser(criteria, options) {
		try {
			return await User.deleteOne(criteria, options);
		} catch (error) {
			throw { error, criteria, options };
		}
	},
	
	async findUsers(criteria, projection, options) {
		try {
			return await User.find(criteria, projection, options);
		} catch (error) {
			throw { error, criteria, projection, options};
		}
	},
	
	async findOneUserAndUpdate(criteria, updateObject, options) {
		try {
			return await User.findOneAndUpdate(criteria, updateObject, options);
		} catch (error) {
			throw { error, criteria, updateObject, options };
		}
	},
	
	async saveUser(user) {
		try {
			return await user.save();
		} catch (error) {
			throw { error, user };
		}
	},

	async createUser(userData) {
		try {
			const user = new User(userData);
			return await this.saveUser(user);
		} catch (error) {
			throw { error, userData };
		}
	}
};
