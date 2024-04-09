const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const saltRounds = 12;
const uniqueValidator = require('mongoose-unique-validator');
const Schema = mongoose.Schema;
const UserSchema = new Schema({
	firstName: {
		type: String,
		required: true
	},
	lastName: {
		type: String,
		default: null
	},
	userRole: {
		type: String,
		default: 'COORDINATOR',
		// enum: ['ADMIN', 'GENERAL_MANAGER', 'DIRECTOR', 'COORDINATOR']
	},
	email: {
		type: String,
		trim: true,
		required: true,
		unique: true,
		index: true
	},
	password: {
		type: String, //bcrypt value
		required: true
	},
	photo: {
		type: String
	},
	mobileNumber: {
		type: String,
		index: true
		// required: true,
	},
	dob: {
		type: Date
	},
	description: {
		type: String
	},
	first_time_login: {
		type: Boolean,
		default: true
	},
	passwordResetToken: {
		type: String,
		default: null
	},
	passwordResetTokenDate: {
		type: Date,
		default: Date.now
	},
	isDeleted: {
		type: Boolean,
		default: false
	},
	//dept and employee num
	employeeDepartment: {
		type: String
	},
	employeeNumber: {
		type: String
	},
	dealershipID: String
}, {
	timestamps: true
});

UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

UserSchema.pre('save', function (next) {
	if (!this.isModified('password')) return next();
	this.password = bcrypt.hashSync(this.password, saltRounds);
	next();
});

module.exports = mongoose.model('User', UserSchema);
