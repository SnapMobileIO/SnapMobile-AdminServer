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
exports.importFromCsv = importFromCsv;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _snapmobileAws = require('snapmobile-aws');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var utils;

function setUtils(_utils) {
  utils = _utils;
}

var blacklistRequestAttributes = ['_id', 'password', 'salt', 'resetPasswordExpires', 'resetPasswordToken', 'updatedAt', 'createdAt', '__v'];
var blacklistResponseAttributes = ['_id', 'password', 'salt', 'resetPasswordExpires', 'resetPasswordToken', '__v'];

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
    }).then(utils.respondWithResult(res, blacklistResponseAttributes)).catch(utils.handleError(next));
  }).catch(utils.handleError(next));
}

/**
 * Gets a single document from the DB
 */
function show(req, res, next) {
  req.class.findOne({ _id: req.params.id }).then(utils.handleEntityNotFound(res)).then(function (result) {
    return result;
  }).then(utils.respondWithResult(res, blacklistResponseAttributes)).catch(utils.handleError(next));
}

/**
 * Creates a new document in the DB
 */
function create(req, res, next) {
  req.class.create(req.body).then(function (result) {
    return result;
  }).then(utils.respondWithResult(res, blacklistResponseAttributes)).catch(utils.handleError(next));
}

/**
 * Updates an existing document in the DB
 */
function update(req, res, next) {
  req.class.findOne({ _id: req.params.id }).then(utils.handleEntityNotFound(res)).then(utils.cleanRequest(req, blacklistRequestAttributes)).then(function (result) {
    if (req.body._id) {
      delete req.body._id;
    }

    var updated = _lodash2.default.assign(result, req.body);
    return updated.save();
  }).then(utils.respondWithResult(res, blacklistResponseAttributes)).catch(utils.handleError(next));
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

/**
 * Imports objects from a csv file hosted at req.body.url
 */
function importFromCsv(req, res, next) {
  console.log(req.body);
  var url = req.body.url;
  var response = _snapmobileAws.awsHelper.getFile(url);
  response.then(function (response) {
    console.log(response.Body.toString('utf8'));
    var responseString = response.Body.toString('utf8').replace(/^\s+|\s+$/g, ''); //remove empty lines at start and end
    var lines = responseString.split('\n');

    var schemaHeaders = Object.keys(req.class.schema.paths);

    var headerString = schemaHeaders.join(',');

    // check if header matches schema
    if (lines.length <= 1 || lines[0] != headerString) {
      res.status(400).end(JSON.stringify({ errors: { error: { message: 'CSV header does not match object' }
        }
      }));
    }

    var createWithRow = function createWithRow(object, row, successCallback, errorCallback) {
      req.class.create(object).then(function (result) {
        successCallback(result, row);
      }).catch(function (error) {
        errorCallback(error, row);
      });
    };

    var responseArray = utils.CSVToArray(responseString);
    var erroredRows = {};
    var finishedRows = 0;
    var returnIfFinished = function returnIfFinished() {
      if (finishedRows == responseArray.length - 1) {
        var numErrors = Object.keys(erroredRows).length;
        if (numErrors == 0) {
          res.status(204).end();
        } else {
          var errors = {};
          var numErrorsToDisplay = 5;
          var numExtraErrors = numErrors - numErrorsToDisplay;
          for (var key in erroredRows) {
            if (numErrorsToDisplay == 0) {
              continue;
            }

            numErrorsToDisplay--;
            errors['error' + key] = { message: 'Unable to add row: ' + key + ' with error: ' + erroredRows[key] };
          }

          if (numExtraErrors > 0) {
            errors.excess = { message: 'And ' + numExtraErrors + ' more errors' };
          }

          res.status(400).end(JSON.stringify({ errors: errors }));
        }
      }
    };

    for (var i = 1; i < responseArray.length; i++) {
      var object = {};
      for (var j = 0; j < schemaHeaders.length; j++) {
        if (blacklistRequestAttributes.indexOf(schemaHeaders[j]) >= 0) {
          continue;
        }

        object[schemaHeaders[j]] = responseArray[i][j];
      }

      createWithRow(object, i, function (result, row) {
        finishedRows++;
        returnIfFinished();
      }, function (error, row) {
        finishedRows++;
        erroredRows[row] = error;
        returnIfFinished();
      });
    }
  }, function (error) {
    res.status(400).end(JSON.stringify({ errors: { error: { message: 'An unknown error occured. Please try again.' }
      }
    }));
  });
}