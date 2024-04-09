function generateRentalContractEmail(emailID, contractID) {
	return {
		recipientAddress: emailID,
		// from: Constants.SERVER.SENDER_EMAIL,
		subject: 'DealerMethods: Rental Contract',
		text: 'New Contract Started \nReference ID: ' + contractID + '\n' +
            'The Contract has been attached to this email.\nDrive Safe!',
		contractFileName: String(contractID + '.docx')
	};
}

module.exports = generateRentalContractEmail;