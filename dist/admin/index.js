'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _composableMiddleware = require('composable-middleware');

var _composableMiddleware2 = _interopRequireDefault(_composableMiddleware);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _admin = require('./admin.controller');

var controller = _interopRequireWildcard(_admin);

var _snapmobileAuthserver = require('snapmobile-authserver');

var _snapmobileAuthserver2 = _interopRequireDefault(_snapmobileAuthserver);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var User;
var auth;

var router = _express2.default.Router();

var attachClass = function attachClass() {
	return (0, _composableMiddleware2.default)().use(function (req, res, next) {
		// TODO: Check that the classname exists (in mongoose.models)
		req.class = _mongoose2.default.model(req.params.className);
		next();
	});
};

module.exports = {
	router: router,
	setUser: function setUser(_user) {
		User = _user;

		_snapmobileAuthserver2.default.setUser(User);
		auth = _snapmobileAuthserver2.default.authService;

		/**
   * Admin routes for CMS
   */
		router.get('/:className/schema', auth.hasRole('admin'), attachClass(), controller.getSchema);
		router.post('/:className/deleteMultiple', auth.hasRole('admin'), attachClass(), controller.destroyMultiple);
		router.get('/:className/exportToCsv', auth.hasRole('admin'), attachClass(), controller.exportToCsv);

		router.get('/:className/', auth.hasRole('admin'), attachClass(), controller.index);
		router.get('/:className/:id', auth.hasRole('admin'), attachClass(), controller.show);
		router.post('/:className/', auth.hasRole('admin'), attachClass(), controller.create);
		router.put('/:className/:id', auth.hasRole('admin'), attachClass(), controller.update);
		router.patch('/:className/:id', auth.hasRole('admin'), attachClass(), controller.update);
		router.delete('/:className/:id', auth.hasRole('admin'), attachClass(), controller.destroy);
	},
	setUtils: function setUtils(_utils) {
		controller.setUtils(_utils);
	}
};