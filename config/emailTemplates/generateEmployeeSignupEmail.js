function generateEmployeeSignupEmail(email, firstName, lastName, randomPassword, FE_URL) {
	return {
		recipientAddress: email,
		subject: 'You\'ve been signed up for DealerMethods!',
		text: 'Hey,\n' +
			'\n' +
			'Welcome to DealerMethods!' +
			'\n\n' +
			firstName + ' ' + lastName + ' invited you to join their dealership!' +
			'\n\nAccept their invitation by logging into: ' + FE_URL +
			'\nYour password is:  ' + randomPassword +
			'\nIt is recommended to change this password on first login.\n' +
			'\n' +
			'Thank you,\n\n' +
			'Team DM'
	};
}

module.exports = generateEmployeeSignupEmail;