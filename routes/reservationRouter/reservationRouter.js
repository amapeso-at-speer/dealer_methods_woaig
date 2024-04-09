const router = require('express').Router();
const validateUser = require('../../config/common/validateUser');
const contractController = require('../../api/controllers/contractController');

// router prefix = /reservation
router.get('/', validateUser, contractController.getAllReservations);

router.post('/makeNew', validateUser, contractController.createNewReservation);

module.exports = router;