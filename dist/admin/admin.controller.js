'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setUtils = setUtils;
exports.getSchema = getSchema;
exports.index = index;
exports.show = show;
exports.create = create;
exports.update = update;
exports.destroy = destroy;
exports.destroyMultiple = destroyMultiple;
exports.exportToCsv = exportToCsv;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: Add frozen properties that should not be returned (e.g., password, salt, etc.)

var utils;

function setUtils(_utils) {
  utils = _utils;
}

/**
 * Return the mongoose schema for the class
 */
function getSchema(req, res, next) {
  res.status(200).json(req.class.schema.paths);
}

/**
 * Gets a list of documents
 */
function index(req, res, next) {
  var limit = Number(req.query.limit) || 20;
  var skip = Number(req.query.skip) || 0;
  var sort = req.query.sort || '-createdAt';

  var searchFilters = req.query.filters;
  var searchQuery = !!searchFilters ? utils.buildQuery(searchFilters) : {};

  req.class.find(searchQuery).count().then(function (count) {

    req.class.find(searchQuery).sort(sort).limit(limit).skip(skip).then(function (result) {
      return { itemCount: count, items: result };
    }).then(utils.respondWithResult(res)).catch(utils.handleError(next));
  }).catch(utils.handleError(next));
}

/**
 * Gets a single document from the DB
 */
function show(req, res, next) {
  req.class.findOne({ _id: req.params.id }).then(utils.handleEntityNotFound(res)).then(function (result) {
    return result;
  }).then(utils.respondWithResult(res)).catch(utils.handleError(next));
}

/**
 * Creates a new document in the DB
 */
function create(req, res, next) {
  req.class.create(req.body).then(function (result) {
    return result;
  }).then(utils.respondWithResult(res)).catch(utils.handleError(next));
}

/**
 * Updates an existing document in the DB
 */
function update(req, res, next) {
  req.class.findOne({ _id: req.params.id }).then(utils.handleEntityNotFound(res)).then(function (result) {
    if (req.body._id) {
      delete req.body._id;
    }

    var updated = _lodash2.default.assign(result, req.body);
    return updated.save();
  }).then(utils.respondWithResult(res)).catch(utils.handleError(next));
}

/**
 * Deletes a document from the DB
 */
function destroy(req, res, next) {
  req.class.findByIdAndRemove(req.params.id).then(utils.handleEntityNotFound(res)).then(function (result) {
    if (result) {
      res.status(204).end();
    }
  }).catch(utils.handleError(next));
}

/**
 * Deletes multiple documents from the DB
 */
function destroyMultiple(req, res, next) {
  req.class.remove({ _id: { $in: req.body.ids } }).then(utils.handleEntityNotFound(res)).then(function (result) {
    if (result) {
      res.status(204).end();
    }
  }).catch(utils.handleError(next));
}

/**
 * Gets a list of documents and converts them to a CSV string
 */
function exportToCsv(req, res, next) {
  var searchFilters = req.query.filters;
  var searchQuery = !!searchFilters ? utils.buildQuery(searchFilters) : {};
  var currentDate = (0, _moment2.default)().format('YYYY-MM-D');
  var filename = req.class.modelName + '-export-' + currentDate + '-.csv';
  req.class.find(searchQuery).then(function (result) {
    var headers = Object.keys(req.class.schema.paths);
    var convertedString = utils.convertToCsv(result, headers);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=' + filename);
    res.send(convertedString);
  }).catch(utils.handleError(next));
}