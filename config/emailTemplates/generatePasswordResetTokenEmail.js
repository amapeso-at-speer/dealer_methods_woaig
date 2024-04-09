function generatePasswordResetTokenEmail(email, p) {
	return {
		recipientAddress: email,
		subject: 'DealerMethods: Password reset token',
		text: 'Hi, \n' + 'Here is your password reset token: \n' + p + ' \nPlease note this is only valid for 10 minutes.' +
			'\nDo not share this code with anybody. If you did not request this, please ignore this email.\n' +
			'\n\nThank you.'
	};
}

module.exports = generatePasswordResetTokenEmail;