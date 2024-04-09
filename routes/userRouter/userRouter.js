const router = require('express').Router();
const validateUser = require('../../config/common/validateUser');
const userController = require('../../api/controllers/usercontroller');

// router prefix = /user
router.get('/getAllUsers', userController.listALLEmployees);

router.post('/employeeSignUp', validateUser, userController.employeeSignUp);
router.post('/editEmployee', validateUser, userController.editEmployee);
router.post('/employeeDelete', validateUser, userController.employeeDelete);

module.exports = router;