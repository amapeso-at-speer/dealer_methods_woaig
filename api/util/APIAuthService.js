const users = [
	{ id: 1, username: 'karan', password: 'DhruviAajBhiTumhariYaadAatiHai', firstName: 'fn', lastName: 'ln' }
];

module.exports = {
	authenticate,
	getAll
};

async function authenticate({ username, password }) {
	const user = users.find(u => u.username === username && u.password === password);
	if (user) {
		const { password, ...userWithoutPassword } = user;
		return userWithoutPassword;
	}
}

async function getAll() {
	return users.map(u => {
		const { password, ...userWithoutPassword } = u;
		return userWithoutPassword;
	});
}
