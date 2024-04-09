const mongoose = require('mongoose');
const Contract = mongoose.model('Contract');

module.exports = {
	async saveContract(contract) {
		try {
			return await contract.save();
		} catch (error) {
			throw { error, contract };
		}
	},

	async createContract(contractData, userId, contractType, customerProfileID, customerEmail, expectedReservationCategory, contractReferenceID) {
		try {
			const contract = new Contract(contractData);

			if (userId) {
				contract.createdBy = userId;
			}
			if (contractType) {
				contract.contractType = contractType;
			}
			if (customerProfileID) {
				contract.customerProfileID = customerProfileID;
			}
			if (customerEmail) {
				contract.customerEmail = customerEmail;
			}
			if (expectedReservationCategory) {
				contract.expectedReservationCategory = expectedReservationCategory;
			}
			if (contractReferenceID) {
				contract.contractReferenceID = contractReferenceID;
			}
			return await this.saveContract(contract);
		} catch (error) {
			throw { error, contractData };
		}
	},

	async findOneContractAndUpdate(criteria, updateObject, options, callback) {
		try {
			return await Contract.findOneAndUpdate(criteria, updateObject, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findContracts(criteria, projection, options, callback) {
		try {
			return await Contract.find(criteria, projection, options, callback);
		} catch (error) {
			throw { error, criteria };
		}
	},

	async findContractById(contractID, projection, callback) {
		try {
			const contract = await Contract.findById(contractID, projection);
			if (callback) {
				return callback(null, contract);
			}
			return contract;
		} catch (error) {
			if (callback) {
				return callback(error, null);
			}
			throw { error, contractID };
		}
	},

	async getPaginatedContracts(pageNum, pageSize, criteria) {
		try {

			pageNum = pageNum - 1;

			const contracts = await Contract
				.find(criteria)
				.sort({createdAt: 'desc'})
				.limit(pageSize)
				.skip(pageSize * pageNum)
				.lean();

			return contracts;

		} catch (error) {
			console.error({error});
		}
	}
};