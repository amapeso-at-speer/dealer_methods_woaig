function generateContractSummaryEmail(emailAddress, fileName) {
	return {
		recipientAddress: emailAddress,
		// from: Constants.SERVER.SENDER_EMAIL,
		subject: 'DealerMethods: Contract Summary',
		text: 'Thank you for using Dealer Methods Services. Please find attached the invoice for your recent booking.',
		invoiceFileName: fileName
	};
}

module.exports = generateContractSummaryEmail;