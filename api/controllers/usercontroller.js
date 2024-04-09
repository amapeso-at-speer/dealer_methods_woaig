const bcrypt = require('bcrypt'),
	jwt = require('jsonwebtoken'),
	crypto = require('crypto'),
	axios = require('axios'),
	Constants = require('../../config/constants');
const store = require('../store/store');
const async = require('async');
const commonFunctions = require('../../config/commons');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const generatePasswordResetTokenEmail = require('../../config/emailTemplates/generatePasswordResetTokenEmail');
const generateEmployeeSignupEmail = require('../../config/emailTemplates/generateEmployeeSignupEmail');
const generateAccountRequestEmail = require('../../config/emailTemplates/generateAccountRequestEmail');
// const { logger } = require('../../config/common/log/logger');

exports.landing = function (req, res) {
	res.sendStatus(404);
};

exports.create = async (req, res) => {
	try {
		const results = await Promise.all([
			store.createUser(req.body),
			store.createDealership()
		]);

		const [userDetails, org] = results;

		res.json({userID: userDetails._id});

		await Promise.all([
			store.updateOneDealership({_id: org._id}, { $addToSet: {'users': userDetails._id} }),
			store.createDealershipHoliday(org._id),
			store.updateOneUser({_id: userDetails._id}, { $set: {'dealershipID': org._id} })
		]);
		
		commonFunctions.sendSignUpEmail(userDetails.email, userDetails.firstName + ' '
                    + userDetails.lastName, (err, data) => {
			if (err) {
				console.error({err, requestBody: req.body});
				// logger.error({err, data, req});
			}
		});
	} catch (error) {
		console.error({error, req});
		// logger.error({error, req});
		return res.json({err: error});
	}
};

// exports.discardSession = function (req, res) {
//     let jwtToken = new ExpiredTokens(req.body)
//     jwtToken.save()
//         .then(resolve => {
//             res.json({status: resolve, message: Constants.APP_MESSAGE.JWT_DISCARD_MESSAGE});
//         })
//         .catch(reject => {
//             res.send(reject);
//         })
// };


exports.authenticate = async (req, res) => {
	try {
		const { email } = req.body;
		const userInstance = await store.findOneUser({ email });

		if (userInstance == null) {
			return res.status(400).send({err: Constants.APP_MESSAGE.INVALID_CREDENTIALS});
		} else if (userInstance.isDeleted) {
			return res.status(401).send({err: Constants.APP_MESSAGE.ACCOUNT_FROZEN});
		} else if (bcrypt.compareSync(req.body.password, userInstance.password)) {
			const dealershipDetails = await store.findDealerships({_id : userInstance.dealershipID}, { businessHours: 1, additionalFeesPresets: 1, taxPresets: 1, odometerKMCharge: 1, gasCharge: 1, warrantyRate: 1, freeKilometers: 1, preAuthPaymentAmount: 1});

			const token = jwt.sign(
				{
					id: userInstance._id,
					userRole : userInstance.userRole
				},
				req.app.get(process.env.APP_SECRET_KEY),
				{expiresIn: Constants.SERVER.JWT_DISCARD_TIME}
			);

			return res.send({
				_id: userInstance._id,
				firstName: userInstance.firstName,
				lastName: userInstance.lastName,
				userEmail: userInstance.email,
				dealershipDetails,
				payload: {token: token}
			});
		} else {
			res.json({err : Constants.APP_MESSAGE.INVALID_CREDENTIALS});
		}
	} catch (error) {
		console.error({error, req});
		res.status(400).json({err: error});
	}
};

exports.changePassword = async (req, res) => {
	try {
		let user;

		async.waterfall([
			async () => {
				user = await store.findOneUser({_id: req.body.userId});
				if (user !== null && bcrypt.compareSync(req.body.currentPassword, user.password)) {
					return true;
				} else {
					throw new Error(Constants.APP_MESSAGE.INCORRECT_PASSWORD_ERROR);
				}
			},
			async () => {
				user.password = req.body.newPassword;
				await store.saveUser(user);

				return res.json({
					status: 'success',
					data: 'Password changed successfully',
					err: null
				});
			}
		], (err) => { 
			if (err){ 
				return res.json({
					err: err.message
				});
			}
		});
	} catch (error) {
		// logger.error({error, req});
		console.error({error, req});
		return res.json({
			err: error
		});
	}
};

exports.home = async (req, res) => {
	try {
		const user = await store.findOneUser({_id: req.body.userId});

		res.json({
			user
		});
	} catch (err) {
		//logger.error({err, req});
		console.error({err, requestBody: req.body});
		res.json({
			err
		});
	}
};

exports.externalEmailPassRoute = (req, res) => {
	let {recipientAddress, subject, html } = req.body;
	const files = req.files;
	commonFunctions.sendHTMLEmail({
		recipientAddress, 
		subject, 
		html, 
		ccTeam: true,
		attachments: files
	}, (err) => {
		if (err) console.error({err, requestBody: req.body});
		// if (err) logger.error({err, req});
		res.json({
			err
		});
	});
};

exports.forgotPassword = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await store.findOneUser({ email });
		const p = crypto.randomBytes(6).toString('hex');

		user.passwordResetTokenDate = Date.now() + 600000;
		user.passwordResetToken = p;

		await store.saveUser(user);

		// commons.sendEmail(
		//     user.email,
		//     Constants.APP_MESSAGE.RESET_PASSWORD_SUBJECT,
		//     "Here is your password reset token: \n" + p + " \nPlease note this is only valid for 10 minutes.",
		//     (err, resolve) => {
		//         console.log(err)
		//     });
		let params = generatePasswordResetTokenEmail(user.email, p);
		commonFunctions.sendTextEmail(params, (err, success) => {
			if (err) console.error({err, requestBody: req.body});
			// if (err) logger.error({err, req});
			console.error({err});
		});

		return res.json({
			status: 'success',
			data: 'Check your email for further instructions.'
		});

	} catch (error) {
		console.error({error, req});
		// logger.error({error, req});
		return res.json({
			status: 'failure',
			data: 'Contact Admin',
			err: error
		});
	}
};

exports.resetPasswordWithToken = async (req, res) => {
	try {
		const { email, passwordToken, newPassword } = req.body;

		const user = await store.findOneUser({ email: email, passwordResetTokenDate: { $gt: Date.now() } });

		if (passwordToken === user.passwordResetToken) {
			user.password = newPassword;
			user.passwordResetToken = (Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15)).toUpperCase();

			await store.saveUser(user);

			return res.json({
				status: 'success',
				err: null
			});
		} else {
			return res.json({
				status: 'failure',
				err: 'Token is invalid'
			});
		}
	} catch (error) {
		console.error({error, req});
		// logger.error({error, req});
		res.json({
			status: 'failure',
			err: 'Token is invalid'
		});
	}
};

exports.deleteUser = async (req, res) => {
	try {
		const { email } = req.body;
		const resolve = await store.deleteOneUser({email});

		res.json(resolve);
	} catch (error) {
		console.error({error, req});
		// logger.error({error, req});
		return res.json({err: error});
	}
};

exports.getUserByID = async (id) => {
	return await store.findOneUser({_id: id});
};

exports.listALLEmployees = (req, res) => {
	store.findUsers()
		.then(userList => {
			return res.send({userList});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.status(400).send({err});
		});
};

exports.employeeSignUp = async (req, res) => {
	try {
		const dealershipDetails = await store.findOneUser({_id: req.body.userId}, {firstName: 1, lastName:1, dealershipID: 1});
		const randomPassword = crypto.randomBytes(5).toString('hex');
		const newUser = {
			...req.body,
			password: randomPassword,
			dealershipID: dealershipDetails.dealershipID
		};

		const user = await store.createUser(newUser);

		res.json({userID: user._id});

		let params = generateEmployeeSignupEmail(user.email, dealershipDetails.firstName, dealershipDetails.lastName, randomPassword, process.env.FE_URL);

		commonFunctions.sendTextEmail(params, (err, data)=> {
			console.log({err, data});
		});
	} catch (error) {
		console.error({error, req});
		return res.status(400).json({err: error});
	}
};


exports.employeeDelete = async (req, res) => {
	try {
		let {userIdToRemove} = req.body;
		const opStatus = await store.findOneUserAndUpdate({_id: userIdToRemove}, {
			$set: {
				['isDeleted'] : true
			}
		}, {
			new: true,
			useFindAndModify: false
		});
		
		res.json({
			userDeleted: opStatus.isDeleted
		});
	} catch (error) {
		console.error({error, req});
		// logger.error({error, req});
		res.json({err:error});
	}
};

exports.receiveNewAccountRequest = (req, res) => {
	let {newAccountDetails} = req.body;
	console.log({newAccountDetails});

	let params = generateAccountRequestEmail(newAccountDetails);
	
	commonFunctions.sendTextEmail(params, (err, data)=> {
		if (err) console.error({err, requestBody: req.body});
		// if (err) logger.error({err, req});
		let sheetRecordErr = googleInit(newAccountDetails);
		res.json({err, sheetRecordErr});
	});

};

function json2table(json, classes) {
	var cols = Object.keys(json[0]);
	var headerRow = '';
	var bodyRows = '';
	cols.map(function(col) {
		headerRow += '<th>' + capitalizeFirstLetter(col) + '</th>';
	});
	json.map(function(row) {
		bodyRows += '<tr>;';
		cols.map(function(colName) {
			bodyRows += '<td>' + row[colName] + '<td>';
		});
		bodyRows += '</tr>';
	});
	let p = ('<table class=' +
        classes +
        '><thead><tr>' +
        headerRow +
        '</tr></thead><tbody>' +
        bodyRows +
        '</tbody></table>');
	return '<html><head></head> <body>' + p + ' </body></html>';
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

async function googleInit(params){
	const doc = new GoogleSpreadsheet(Constants.SERVER.NEWACCOUNTGOOGLESHEET);
	await doc.useServiceAccountAuth(require(process.env.GOOGLE_AUTH_PASS));
	await doc.loadInfo();
	const sheet = doc.sheetsByIndex[0]; // or use doc.sheetsById[id]
	// FirstName	LastName	Company	JobTitle	Email	PhoneNumber	Country	Message	Consent
	return await sheet.addRows([
		{
			FirstName: params.firstName || 'Not provided',
			LastName: params.lastName || 'Not provided',
			Company: params.company || 'Not provided',
			JobTitle: params.jobTitle || 'Not provided',
			Email: params.email || 'Not provided',
			PhoneNumber: params.phoneNumber || 'Not provided',
			Country: params.country || 'Not provided',
			Message: params.message || 'Not provided',
			Consent: params.consent || 'Not provided',
		},
	]);
}

exports.sendSMS = (req, res) => {
	let {message, phoneNumber, subject} = req.body;

	commonFunctions.sendSMS({message, phoneNumber, subject}, (err, state) => {
		return res.json({err, state});
	});
};

exports.editEmployee = async (req, res) => {
	let {userId, employeeID, employeeEditFields} = req.body;
	let editorRole = await store.findOneUser({_id: userId}, {userRole: 1});
	if( editorRole.userRole != 'ADMIN' && editorRole.userRole != 'GENERAL_MANAGER' && editorRole.userRole != 'DIRECTOR'){
		return res.json({err: 'Unauthorized, only admins can edit other employee details.'});
	}
	let sanitisedEmployeeEditFields = {};
	if(!employeeEditFields) {
		return res.statusCode(400).json({err: 'fields not provided'});
	}
	if((employeeEditFields.firstName)){
		sanitisedEmployeeEditFields.firstName = employeeEditFields.firstName;
	}
	if((employeeEditFields.lastName)){
		sanitisedEmployeeEditFields.lastName = employeeEditFields.lastName;
	}
	if((employeeEditFields.email)){
		sanitisedEmployeeEditFields.email = employeeEditFields.email;
	}
	if((employeeEditFields.mobileNumber)){
		sanitisedEmployeeEditFields.mobileNumber = employeeEditFields.mobileNumber;
	}
	if((employeeEditFields.employeeDepartment)){
		sanitisedEmployeeEditFields.employeeDepartment = employeeEditFields.employeeDepartment;
	}
	if((employeeEditFields.employeeNumber)) {
		sanitisedEmployeeEditFields.employeeNumber = employeeEditFields.employeeNumber;
	}

	store.findOneUserAndUpdate(
		{_id: employeeID},
		{$set: sanitisedEmployeeEditFields},
		{new: true, useFindAndModify: false})
		.then(updatedEmployee => {
			return res.json({updatedEmployee});
		})
		.catch(err => {
			console.error({err, requestBody: req.body});
			// logger.error({err, req});
			return res.json({err});
		});
};

function isNullOrUndefined(obj) {
	return (obj == null);
}


exports.getPlaces = async (req, res) => {
	let requestBody = (req.body);
	let transactionID = 3;
	async function fetchPlaces(callback, centroid) {
		placesPromises = [];

		if ( requestBody?.contract_type?.toString().toLowerCase() === "rent") {
			transactionID = 3;
		} else {
			transactionID = 2;
		}
		for (let i = 1; i < 2; i++) {
			placesPromises.push(makeRapidApiCall(i, centroid));
		}
		let places = await Promise.all(placesPromises);
		let flattenedPlaces = places.flat(1);
		return callback(null, flattenedPlaces).then((res) => {
			return res;
		});
	}
	function makeRapidApiCall(i, centroid) {
		const box = getBoundingBox(centroid[0], centroid[1], 5000);
		const data = {
			home_type: requestBody.home_type,
			contract_type: requestBody.contract_type,
			PriceMin: requestBody.min_price,
			PriceMax: requestBody.max_price,
			city: requestBody.city,
		};
		const config = {
			method: "get",
			url:
				"https://realtor-canadian-real-estate.p.rapidapi.com/properties/list-residential?CurrentPage=" +
				i +
				`&LatitudeMin=${box[2]}&LongitudeMax=${box[1]}&RecordsPerPage=50&LongitudeMin=${box[0]}&LatitudeMax=${box[3]}` +
				`&TransactionTypeId=` +
				transactionID,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Request-Method": "*",
				"x-rapidapi-key": "67faf03af3mshbbd989a7d28c963p1b2a96jsne41373ad4653",
				"x-rapidapi-host": "realtor-canadian-real-estate.p.rapidapi.com",
			},
			params: data,
		};
		return new Promise((resolve, reject) => {
			axios(config)
				.then(function (response) {
					// db.createEntry(response.data.Results);
					resolve(response.data.Results);
				})
				.catch(function (error) {
					reject(error);
				});
		});
	}
	let matchPercentageCalculator = async (filteredPlacesArray, criteria) => {
		for (let place of filteredPlacesArray) {
			let doorzCriteriaMatchObj = {};
			// let doorzCriteriaMatchObjCount = {};
			let matchedHouseTraits = 0;
			let matchedNeighbourhoodTraits = 0;
			let requestedTraits = 5;

			doorzCriteriaMatchObj.neighbourhoodTraits = [];
			doorzCriteriaMatchObj.homeTraits = [];

			doorzCriteriaMatchObj.centroid = criteria.centroid;
			doorzCriteriaMatchObj.favPlacesGeoArr = criteria.favPlacesGeoArr;

			// Home Traits
			let isBedroomMatch = await getBedroomMatch(place, criteria.bedrooms);
			if (isBedroomMatch.match === true) {
				matchedHouseTraits = matchedHouseTraits + 1;
				doorzCriteriaMatchObj.homeTraits.push({
					bedroomMatch: isBedroomMatch.amount,
				});
			}
			let isBathroomMatch = await getBathroomMatch(
				place,
				criteria.bathroomCount
			);
			if (isBathroomMatch.match === true) {
				matchedHouseTraits = matchedHouseTraits + 1;
				doorzCriteriaMatchObj.homeTraits.push({
					bathroomMatch: isBathroomMatch.amount,
				});
			}
			let totalParking = await getParking(place, criteria.parking);
			if (totalParking.match === true) {
				matchedHouseTraits = matchedHouseTraits + 1;
				doorzCriteriaMatchObj.homeTraits.push({
					totalParking: totalParking.amount,
				});
			}

			let isPriceMatch = true; /*MATCHED BY RAPID API*/
			if (isPriceMatch === true) {
				matchedHouseTraits = matchedHouseTraits + 1;
				doorzCriteriaMatchObj.homeTraits.push({
					priceMatch: true,
				});
			}

			let isHomeTypeMatch = await findHomeTypeMatch(place);
			if (isHomeTypeMatch === true && requestBody.home_type) {
				matchedHouseTraits = matchedHouseTraits + 1;
				doorzCriteriaMatchObj.homeTraits.push({
					homeType: requestBody.home_type,
				});
			}

			const placeCoordinates = [
				parseFloat(place.Property.Address.Latitude),
				parseFloat(place.Property.Address.Longitude),
			];

			doorzCriteriaMatchObj.distance = haversineDistance(
				[criteria.centroid[1], criteria.centroid[0]],
				placeCoordinates
			);

			// Neighbourhood Traits
			//isPriceBelowSpecified(place, '250000');
			if (criteria.isParkNearby === true) {
				requestedTraits = requestedTraits + 1;
				let isNearByParkMatch = await findInAmenities(place, "park");
				if (isNearByParkMatch === true) {
					matchedNeighbourhoodTraits = matchedNeighbourhoodTraits + 1;
					doorzCriteriaMatchObj.neighbourhoodTraits.push({
						isNearByParkMatch: true,
					});
				}
			}
			if (criteria.isWalkFriendly === true) {
				requestedTraits = requestedTraits + 1;
				let isWalkFriendly = await findInAmenities(place, "park");
				if (isWalkFriendly === true) {
					matchedNeighbourhoodTraits = matchedNeighbourhoodTraits + 1;
					doorzCriteriaMatchObj.neighbourhoodTraits.push({
						isWalkFriendly: true,
					});
				}
			}
			if (criteria.isSchoolsNearby === true) {
				requestedTraits = requestedTraits + 1;
				let isSchoolsNearby = await findInAmenities(place, "Schools");
				if (isSchoolsNearby === true) {
					matchedNeighbourhoodTraits = matchedNeighbourhoodTraits + 1;
					doorzCriteriaMatchObj.neighbourhoodTraits.push({
						isSchoolsNearby: true,
					});
				}
			}
			if (criteria.totalParking === true) {
				requestedTraits = requestedTraits + 1;
				let isPetFriendly = await findInAmenities(place, "park");
				if (isPetFriendly === true) {
					matchedNeighbourhoodTraits = matchedNeighbourhoodTraits + 1;
					doorzCriteriaMatchObj.neighbourhoodTraits.push({
						isPetFriendly: true,
					});
				}
			}
			if (criteria.isTransitFriendly === true) {
				requestedTraits = requestedTraits + 1;
				let isTransitFriendly = await findInAmenities(place, "Public Transit");
				if (isTransitFriendly === true) {
					matchedNeighbourhoodTraits = matchedNeighbourhoodTraits + 1;
					doorzCriteriaMatchObj.neighbourhoodTraits.push({
						isTransitFriendly: true,
					});
				}
			}
			if (criteria.isRestaurantNearby === true) {
				requestedTraits = requestedTraits + 1;
				let isRestaurantNearby = false;
				if (isRestaurantNearby === true) {
					matchedNeighbourhoodTraits = matchedNeighbourhoodTraits + 1;
					doorzCriteriaMatchObj.neighbourhoodTraits.push({
						isRestaurantNearby: true,
					});
				}
			}

			doorzCriteriaMatchObj.matchedHouseTraitsCount = matchedHouseTraits;
			doorzCriteriaMatchObj.matchedNeighbourhoodTraits = matchedNeighbourhoodTraits;
			let matchedTraitsTotal = matchedHouseTraits + matchedNeighbourhoodTraits; //to calculate match percentage

			place.doorzCriteriaMatchObj = doorzCriteriaMatchObj;
			// place.percentMatch = await calculatePercentFromCriteria(
			//   doorzCriteriaMatchObj
			// );

			place.percentMatch = await calculatePercentFromCriteria(
				matchedTraitsTotal,
				requestedTraits
			);

			//add distance to each of fav places
			const placeGeo = placeCoordinates;

			const favPlacesGeoArr = criteria.favPlacesGeoArr;

			let distances = [];
			if (favPlacesGeoArr.length > 0) {
				console.log("setting distances");
				distances = favPlacesGeoArr.map((favPlace) => {
					return {
						distance: haversineDistance(
							[favPlace.coordinates[1], favPlace.coordinates[0]],
							placeGeo
						),
						favPlaceId: favPlace.id,
					};
				});
			}

			place.distancesToFavPlaces = distances;
		}

		const sortedPlacesArray = [...filteredPlacesArray]
			.sort((a, b) => b.percentMatch - a.percentMatch)
			.slice(0, 10);
		return sortedPlacesArray;
	};

	// async function calculatePercentFromCriteria(criteriaObj) {
	//   let sum = 0;
	//   Object.values(criteriaObj).forEach((v) => {
	//     if (v) {
	//       sum = sum + 1;
	//     }
	//   });
	//   return parseFloat((sum / Object.values(criteriaObj).length) * 1e2).toFixed(
	//     3
	//   );
	// }matchedTraitsTotal

	async function calculatePercentFromCriteria(
		matchedTraitsTotal,
		requestedTraits
	) {
		let percentMatch = (matchedTraitsTotal * 100) / requestedTraits;
		return percentMatch;
	}

	async function getParking(place, parkingCount) {
		try {
			if (
				parseFloat(place.Property.ParkingSpaceTotal) >=
				parseFloat(parkingCount) ||
				parkingCount === 0
			) {
				return { match: true, amount: place.Property.ParkingSpaceTotal };
			}
		} catch (e) {}
		return { match: false, amount: place.Property.ParkingSpaceTotal };
	}
	async function getBedroomMatch(place, bedroomCount) {
		try {
			if (
				parseFloat(place.Building.Bedrooms) >= parseFloat(bedroomCount) ||
				bedroomCount === 0
			) {
				return { match: true, amount: place.Building.Bedrooms };
			}
		} catch (e) {}
		return { match: false, amount: place.Building.Bedrooms };
	}
	async function findHomeTypeMatch(place) {
		/*TODO*/
		return true;
	}
	async function getBathroomMatch(place, bathroomCount) {
		try {
			if (
				parseFloat(place.Building.BathroomTotal) >= parseFloat(bathroomCount) ||
				bathroomCount === 0
			) {
				return { match: true, amount: place.Building.BathroomTotal };
			}
		} catch (e) {}
		return { match: false, amount: place.Building.BathroomTotal };
	}
	async function findInAmenities(place, criteria) {
		try {
			if (
				place.Property.AmmenitiesNearBy.toString()
					.toLowerCase()
					.includes(criteria.toString().toLowerCase())
			) {
				return true;
			}
		} catch (e) {}
		return false;
	}
	async function isPriceBelowSpecified(place, specifiedPrice) {
		try {
			return getPlacePrice(place) <= parseFloat(specifiedPrice);
		} catch (e) {}
		return false;
	}
	async function getPlacePrice(place) {
		try {
			let pricePerSqFt = getConvertedPrice(
				place.Property.PriceUnformattedValue
			);
			if (pricePerSqFt) {
				throw new Error("INVALID_NUMBER_EXCEPTION");
			}
			let totalArea = place.Land.SizeTotal;
			return pricePerSqFt * parseFloat(totalArea);
		} catch (e) {}
		return Number.MAX_SAFE_INTEGER;
	}
	async function getConvertedPrice(rawPrice) {
		try {
			// rawPrice.replace('$', '');
			// rawPrice.replace('/', ' ');
			return parseFloat(rawPrice.split(" ")[0]);
		} catch (e) {}
		return Number.MAX_SAFE_INTEGER;
	}
	function rad2degr(rad) {
		return (rad * 180) / Math.PI;
	}
	function degr2rad(degr) {
		return (degr * Math.PI) / 180;
	}

	function getLatLngCenter(latLngInDegr) {
		var LATIDX = 0;
		var LNGIDX = 1;
		var sumX = 0;
		var sumY = 0;
		var sumZ = 0;

		for (var i = 0; i < latLngInDegr.length; i++) {
			var lat = degr2rad(latLngInDegr[i][LATIDX]);
			var lng = degr2rad(latLngInDegr[i][LNGIDX]);
			// sum of cartesian coordinates
			sumX += Math.cos(lat) * Math.cos(lng);
			sumY += Math.cos(lat) * Math.sin(lng);
			sumZ += Math.sin(lat);
		}

		var avgX = sumX / latLngInDegr.length;
		var avgY = sumY / latLngInDegr.length;
		var avgZ = sumZ / latLngInDegr.length;

		// convert average x, y, z coordinate to latitude and longtitude
		var lng = Math.atan2(avgY, avgX);
		var hyp = Math.sqrt(avgX * avgX + avgY * avgY);
		var lat = Math.atan2(avgZ, hyp);

		return [rad2degr(lat), rad2degr(lng)];
	}

	/**
	 * Calculates the haversine distance between point A, and B.
	 * @param {number[]} latlngA [lat, lng] point A
	 * @param {number[]} latlngB [lat, lng] point B
	 * @param {boolean} isMiles If we are using miles, else km.
	 */
	const haversineDistance = ([lat1, lon1], [lat2, lon2], isMiles = false) => {
		// const toRadian = angle => (Math.PI / 180) * angle;
		const distance = (a, b) => (Math.PI / 180) * (a - b);
		const RADIUS_OF_EARTH_IN_KM = 6371;

		const dLat = distance(lat2, lat1);
		const dLon = distance(lon2, lon1);

		lat1 = degr2rad(lat1);
		lat2 = degr2rad(lat2);

		// Haversine Formula
		const a =
			Math.pow(Math.sin(dLat / 2), 2) +
			Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
		const c = 2 * Math.asin(Math.sqrt(a));

		let finalDistance = RADIUS_OF_EARTH_IN_KM * c;

		if (isMiles) {
			finalDistance /= 1.60934;
		}

		return finalDistance;
	};

	function getBoundingBox(pLatitude, pLongitude, pDistanceInMeters) {
		var degLatKm = 110.574235;

		var deltaLat = pDistanceInMeters / 1000.0 / degLatKm;

		var deltaLong = pDistanceInMeters / 1000.0 / degLatKm;

		var topLat = pLatitude + deltaLat;
		var bottomLat = pLatitude - deltaLat;
		var leftLng = pLongitude - deltaLong;
		var rightLng = pLongitude + deltaLong;

		var longMin = bottomLat;
		var longMax = topLat;
		var latMin = leftLng;
		var latMax = rightLng;

		var bbox = [longMin, longMax, latMin, latMax];

		//console.log(`${bbox[2]},${bbox[0]},${bbox[3]},${bbox[1]}`);
		return bbox;
	}

	if (typeof Number.prototype.toRad === "undefined") {
		Number.prototype.toRad = function () {
			return (this * Math.PI) / 180;
		};
	}

	const sampleCriteria = {
		// bedrooms: 2,
		// bathroomCount: 2,
		bedrooms: requestBody.bedrooms,
		bathroomCount: requestBody.bathrooms,
		parking: requestBody.parking,
		isRestaurantNearby: requestBody.isRestaurantNearby,
		isSchoolsNearby: requestBody.isSchoolsNearby,
		isParkNearby: requestBody.isParkNearby,
		isPetFriendly: requestBody.isPetFriendly,
		isWalkFriendly: requestBody.isWalkFriendly,
		isTransitFriendly: requestBody.isTransitFriendly,
		transportation: requestBody.transportation,
		placesOfInterest: requestBody.placesOfInterest,
	};
	async function main() {
		//get centroid of request
		let reqLatLngPairs;
		if (
			requestBody.placesOfInterest &&
			requestBody.placesOfInterest.length > 0
		) {
			reqLatLngPairs = requestBody.placesOfInterest.map(
				(place) => place.geometry.coordinates
			);
		} else {
			reqLatLngPairs = [[-75.695152, 45.420718]];
		}

		let reqLatLngName = [];
		if (
			requestBody.placesOfInterest &&
			requestBody.placesOfInterest.length > 0
		) {
			console.log("setting reqLatLngName");
			reqLatLngName = requestBody.placesOfInterest.map((place) => {
				return {
					coordinates: place.geometry.coordinates,
					id: place.id,
					customName: place.customName,
				};
			});
		}

		const centroid = getLatLngCenter(reqLatLngPairs);
		sampleCriteria.centroid = centroid;

		//array of all favourite places geo
		sampleCriteria.favPlacesGeoArr = reqLatLngName;

		return await fetchPlaces(async (err, places) => {
			if (err) return err;
			let processedPlaces = await matchPercentageCalculator(
				places,
				sampleCriteria
			);
			// console.log(JSON.stringify(processedPlaces));
			return processedPlaces;
		}, centroid);
	}

	const places = await main();
	const formattedPlaces = await processPlaces(places)
	return res.json({places: formattedPlaces});
}

async function processPlaces(placesArray) {
	let processedPlaces = new Array();
	for(let place of placesArray){
		try{
			processedPlaces.push(formatPlace(place))
		} catch (e) {
			console.error({err: "Err while converting place to format:" + e});
		}
	}
	return processedPlaces;
}

function formatPlace(place) {
	return {
		id: place.Id,
		mlsNumber: place.MlsNumber,
		description: place.PublicRemarks,
		building: {
			bathroomTotal: place.Building.BathroomTotal,
			bedrooms: place.Building.Bedrooms,
			type: place.Building.Type,
			ammenities: place.Building.Ammenities
		},
		individualContact: processIndividual(place.Individual),
		property: {
			price: place?.Property?.Price || "0",
			maintenanceFee: "$120",
			type: place?.Property?.Type || 0,
			address: place?.Property?.Address ? { 
				addressText: place?.Property?.Address.AddressText,
				longitude: place?.Property?.Address.Longitude,
				latitude: place?.Property?.Address.Latitude,
				disseminationArea: place?.Property?.Address.DesseminationArea,
				permitShowAddress: place?.Property?.Address.PermitShowAddress
			} : "",
			parking: place?.Property?.Parking?.map(parking => ({name: parking.Name})) || "",
			parkingSpaceTotal: place?.Property?.ParkingSpaceTotal || 0,
			ammenitiesNearBy: place?.Property?.AmmenitiesNearBy || 0,
			parkingType: place?.Property?.ParkingType
		},
		relativeDetailsURL: place?.RelativeDetailsURL,
		postalCode: place.PostalCode,
		imageURL: place?.Property?.Photo?.map(photo => photo.HighResPath) || "",
		matchAlgCriteria: {
			...place.doorzCriteriaMatchObj,
			percentMatch: place.percentMatch,
			distanceToSpPlace: place.distancesToFavPlaces
		}
	};
}
//"permitFreetextEmail": true,
//                     "permitShowListingLink": true,
//                     "relativeDetailsURL": "/office/firm/271789/sutton-group-admiral-realty-inc-1206-centre-street-thornhill-ontario-l4j3m9",
//                     "photoLastupdate": "2021-01-04 8:01:47 AM"

function processIndividual(individuals) {
	let formatterIndividuals= new Array();
	for(let singleIndividual of individuals){
		try{
			let processedResult = {
				individualID: singleIndividual?.IndividualID || 0,
				name: singleIndividual?.Name || 0,
				organizationType: singleIndividual?.Organization?.OrganizationType || "",
				designation: singleIndividual?.Organization?.Designation || "",
				permitFreeTextEmail: singleIndividual?.permitFreetextEmail || 0,
				permitShowListingLink: singleIndividual?.PermitShowListingLink || 0,
				relativeDetailsURL: singleIndividual?.RelativeDetailsURL || 0,
				photoLastUpdate: singleIndividual?.Organization?.PhotoLastupdate || 0,
				phones: singleIndividual?.Phones.map(phone => ({phoneType: phone.PhoneType, phoneNumber: phone.PhoneNumber, areaCode: phone.AreaCode, phoneTypeId: phone.PhoneTypeId})) || 0,
				emails: singleIndividual?.Emails.map(email => ({contactId: email.ContactId})) || 0
			}
			formatterIndividuals.push(processedResult);
		} catch (e){
			console.error({processIndividualErr: e})
		}
	}
	return formatterIndividuals;
}
