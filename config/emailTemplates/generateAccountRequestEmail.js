function generateAccountRequestEmail(newAccountDetails) {
	return {
		recipientAddress: 'mlorenc@dealermethods.com',
		subject: 'DealerMethods: New Account Request',
		text:
            'Hey,\n' +
            '\n' +
            'A new account request has been received, the details are as follows:\n\n'+
             JSON.stringify(newAccountDetails, null, 2)
            + '\n\nTeam DM'
	};
}

module.exports = generateAccountRequestEmail;