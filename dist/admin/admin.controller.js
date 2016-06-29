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

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _snapmobileAws = require('snapmobile-aws');

var _adminHelper = require('./admin.helper.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var utils = void 0;

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

  var searchFilters = req.query.filters || [];
  // let searchQuery = searchFilters.length ? utils.buildQuery(searchFilters) : {};
  var searchQuery = {};

  // See if we have a populate method for our class
  // if we don't populatedFields should be blank
  var populatedFields = '';

  if (typeof req.class.populateForAdmin === 'function') {
    populatedFields = req.class.populateForAdmin();
  }

  console.log('****** searchFilters', searchFilters);
  // console.log('****** searchQuery', searchQuery);

  var promises = [];
  var queryOptions = [];
  var nonRelFilter = [];

  for (var i = searchFilters.length - 1; i >= 0; i--) {

    // Check to see if there is a period in the filter field
    // if so, we're looking for a relationship
    var split = searchFilters[i].field.split('.');

    if (split.length > 1) {
      console.log('**** split 0', split[0]);
      console.log('**** split 1', split[1]);

      var searchClass = split[0];
      var searchField = split[1];
      var relationshipClassName = req.class.schema.paths[searchClass].options.ref;
      var relationshipClass = _mongoose2.default.model(relationshipClassName);

      var relationshipQuery = {};
      relationshipQuery[searchField] = searchFilters[i].value;

      queryOptions.push(split);
      promises.push(relationshipClass.find(relationshipQuery, '_id'));
    } else {
      nonRelFilter.push(searchFilters[i]);
    }
  }

  // Create a large list of IDs that we're looking for
  var resultIds = [];

  _bluebird2.default.all(promises).then(function (results) {

    searchQuery['$and'] = [];

    // Loop through the results to collect the ids for each relationship
    for (var _i = results.length - 1; _i >= 0; _i--) {
      resultIds = results[_i].map(function (o) {
        return o._id.toString();
      });
      var obj = {};
      obj[queryOptions[_i][0]] = { $in: resultIds };
      searchQuery['$and'].push(obj);
      console.log('*** searchQuery $and', searchQuery['$and']);
    }

    // Add on any non relationship stuff
    var buildQuery = utils.buildQuery(nonRelFilter);

    console.log('*** build query', buildQuery);
    console.log('*** build query $and', buildQuery['$and']);
    console.log('*** searchQuery $and 2', searchQuery['$and']);

    // searchQuery = _.merge(searchQuery, buildQuery);

    searchQuery['$and'] = searchQuery['$and'].concat(buildQuery['$and']);

    console.log('**** search query', searchQuery);

    // Now we can get all of our results with our IDs
    return req.class.find(searchQuery).count().then(function (count) {

      return req.class.find(searchQuery).populate(populatedFields).sort(sort).limit(limit).skip(skip).then(function (result) {
        return { itemCount: count, items: result };
      });
    });
  }).then(utils.respondWithResult(res, blacklistResponseAttributes)).catch(utils.handleError(next));

  // // If this is a search for a relationship, first get all of the documents
  // // Then query the main class with an $in query

  // let searchClass = '_ticket';

  // console.log('**** schema', req.class.schema.paths[searchClass].options.ref);

  // let relationshipClassName = req.class.schema.paths[searchClass].options.ref;

  // // Get the relationship class
  // let relationshipClass = mongoose.model(relationshipClassName);

  // console.log('*****relationshipClassName', relationshipClass)

  // // new RegExp(filter.value, 'i')
  // let relationshipQuery = { ticketNumber: 'CHI008' };

  // relationshipClass.find({ ticketNumber: 'CHI008' }, '_id')
  //   .then((results) => {
  //     // Collect the ids
  //     let resultIds = results.map((o) => { return o._id });
  //     console.log('*** resultIds', resultIds);

  //     searchQuery = { _ticket: { $in: resultIds } };

  //     return req.class.find(searchQuery).count()
  //       .then(count => {

  //         return req.class.find(searchQuery)
  //           .populate(populatedFields)
  //           .sort(sort)
  //           .limit(limit)
  //           .skip(skip)
  //           .then((result) => {
  //             return { itemCount: count, items: result };
  //           });
  //       });
  //   })
  //   .then(utils.respondWithResult(res, blacklistResponseAttributes))
  //   .catch(utils.handleError(next));
}

/**
 * Gets a single document from the DB
 */
function show(req, res, next) {
  // See if we have a populate method for our class
  // if we don't populatedFields should be blank
  var populatedFields = '';

  if (typeof req.class.populateForAdmin === 'function') {
    populatedFields = req.class.populateForAdmin();
  }

  req.class.findOne({ _id: req.params.id }).populate(populatedFields).then(utils.handleEntityNotFound(res)).then(function (result) {
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
    var convertedString = (0, _adminHelper.convertToCsv)(result, headers);
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename=' + filename);
    res.send(convertedString);
  }).catch(utils.handleError(next));
}

/**
 * Imports objects from a csv file hosted at req.body.url
 */
function importFromCsv(req, res, next) {
  var url = req.body.url;
  var response = _snapmobileAws.awsHelper.getFile(url);
  response.then(function (response) {
    var responseString = response.Body.toString('utf8').replace(/^\s+|\s+$/g, ''); //remove empty lines at start and end
    var lines = responseString.split('\n');

    var schemaHeaders = Object.keys(req.class.schema.paths);

    var headerString = schemaHeaders.join(',');

    // check if header matches schema
    if (lines.length <= 1 || lines[0] !== headerString) {
      res.status(400).end(JSON.stringify({ errors: { error: { message: 'CSV header does not match object' }
        }
      }));
    }

    var responseArray = (0, _adminHelper.csvToArray)(responseString);
    var erroredRows = {};
    var finishedRows = 0;

    for (var i = 1; i < responseArray.length; i++) {
      var object = {};
      for (var j = 0; j < schemaHeaders.length; j++) {
        if (schemaHeaders[j] != '_id' && blacklistRequestAttributes.indexOf(schemaHeaders[j]) >= 0) {
          continue;
        }

        var element = responseArray[i][j];

        // If the element is undefined or null, convert to empty string
        if (!element) {
          element = '';
        }

        // If this element isn't a string, then we should try and parse it as JSON
        if (typeof element !== 'string') {
          element = JSON.parse(element);
        }

        object[schemaHeaders[j]] = element;
      }

      createWithRow(req, object, i, function (result, row) {
        finishedRows++;
        returnIfFinished(res, finishedRows, responseArray, erroredRows);
      }, function (error, row) {
        finishedRows++;
        erroredRows[row] = error;
        returnIfFinished(res, finishedRows, responseArray, erroredRows);
      });
    }
  }, function (error) {
    res.status(400).end(JSON.stringify({ errors: { error: { message: 'An unknown error occured. Please try again.' }
      }
    }));
  });
}

/**
 * Creates an object and returns the passed row
 * @param {Object} req the req parameter
 * @param  {Object} object          the object number
 * @param  {Int} row             the row number
 * @param  {func} successCallback on success
 * @param  {func} errorCallback   on error
 */
function createWithRow(req, object, row, successCallback, errorCallback) {
  req.class.findById(object._id, function (err, found) {
    if (found) {
      //update
      req.class.update(object).then(function (result) {
        successCallback(result, row);
      }).catch(function (error) {
        errorCallback(error, row);
      });
    } else {
      delete object._id;
      req.class.create(object).then(function (result) {
        successCallback(result, row);
      }).catch(function (error) {
        errorCallback(error, row);
      });
    }
  });
};

/**
 * Ends the current request if all imports have finished
 * @param  {Object} res the res parameter
 * @param  {Integer} finishedRows the number of finished rows
 * @param  {Array} responseArray  the CSV array
 * @param  {Object} erroredRows   the rows that have errored
 */
function returnIfFinished(res, finishedRows, responseArray, erroredRows) {
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
}