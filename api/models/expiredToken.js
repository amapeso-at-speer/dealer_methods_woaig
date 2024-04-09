const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;
const ExpiredTokensSchema = new Schema({
	id: {
		type: String,
		trim: true,
		required: true,
		unique: true
	}
});

ExpiredTokensSchema.plugin(uniqueValidator, {message: 'is already discarded.'});

module.exports = mongoose.model('ExpiredTokens', ExpiredTokensSchema);
