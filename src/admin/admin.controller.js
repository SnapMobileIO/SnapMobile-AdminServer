'use strict';

import _ from 'lodash';
import moment from 'moment';
import { awsHelper } from 'snapmobile-aws';
import Promise from 'bluebird';
import { convertToCsv, csvToArray } from './admin.helper.js';

var utils;

export function setUtils(_utils) {
  utils = _utils;
}

const blacklistRequestAttributes = ['_id',
                                    'password',
                                    'salt',
                                    'resetPasswordExpires',
                                    'resetPasswordToken',
                                    'updatedAt',
                                    'createdAt',
                                    '__v'];
const blacklistResponseAttributes = ['_id',
                                     'password',
                                     'salt',
                                     'resetPasswordExpires',
                                     'resetPasswordToken',
                                     '__v'];

/**
 * Return the mongoose schema for the class
 */
export function getSchema(req, res, next) {
  res.status(200).json(req.class.schema.paths);
}

/**
 * Gets a list of documents
 */
export function index(req, res, next) {
  let limit = Number(req.query.limit) || 20;
  let skip = Number(req.query.skip) || 0;
  let sort = req.query.sort || '-createdAt';

  let searchFilters = req.query.filters;
  let searchQuery = !!searchFilters ? utils.buildQuery(searchFilters) : {};

  req.class.find(searchQuery).count()
    .then(count => {

      req.class.find(searchQuery)
        .sort(sort)
        .limit(limit)
        .skip(skip)
        .then((result) => {
          return { itemCount: count, items: result };
        })
        .then(utils.respondWithResult(res, blacklistResponseAttributes))
        .catch(utils.handleError(next));
    })
    .catch(utils.handleError(next));
}

/**
 * Gets a single document from the DB
 */
export function show(req, res, next) {
  req.class.findOne({ _id: req.params.id })
    .then(utils.handleEntityNotFound(res))
    .then((result) => {
      return result;
    })
    .then(utils.respondWithResult(res, blacklistResponseAttributes))
    .catch(utils.handleError(next));
}

/**
 * Creates a new document in the DB
 */
export function create(req, res, next) {
  req.class.create(req.body)
    .then((result) => {
      return result;
    })
    .then(utils.respondWithResult(res, blacklistResponseAttributes))
    .catch(utils.handleError(next));
}

/**
 * Updates an existing document in the DB
 */
export function update(req, res, next) {
  req.class.findOne({ _id: req.params.id })
    .then(utils.handleEntityNotFound(res))
    .then(utils.cleanRequest(req, blacklistRequestAttributes))
    .then(result => {
      if (req.body._id) {
        delete req.body._id;
      }

      let updated = _.assign(result, req.body);
      return updated.save();
    })
    .then(utils.respondWithResult(res, blacklistResponseAttributes))
    .catch(utils.handleError(next));
}

/**
 * Deletes a document from the DB
 */
export function destroy(req, res, next) {
  req.class.findByIdAndRemove(req.params.id)
    .then(utils.handleEntityNotFound(res))
    .then(result => {
      if (result) {
        res.status(204).end();
      }
    })
    .catch(utils.handleError(next));
}

/**
 * Deletes multiple documents from the DB
 */
export function destroyMultiple(req, res, next) {
  req.class.remove({ _id: { $in: req.body.ids } })
    .then(utils.handleEntityNotFound(res))
    .then(result => {
      if (result) {
        res.status(204).end();
      }
    })
    .catch(utils.handleError(next));
}

/**
 * Gets a list of documents and converts them to a CSV string
 */
export function exportToCsv(req, res, next) {
  let searchFilters = req.query.filters;
  let searchQuery = !!searchFilters ? utils.buildQuery(searchFilters) : {};
  let currentDate = moment().format('YYYY-MM-D');
  let filename = `${req.class.modelName}-export-${currentDate}-.csv`;
  req.class.find(searchQuery)
    .then((result) => {
      let headers = Object.keys(req.class.schema.paths);
      let convertedString = convertToCsv(result, headers);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename=' + filename);
      res.send(convertedString);
    })
    .catch(utils.handleError(next));
}

/**
 * Imports objects from a csv file hosted at req.body.url
 */
export function importFromCsv(req, res, next) {
  let url = req.body.url;
  let response = awsHelper.getFile(url);
  response.then((response) => {
    let responseString = response.Body.toString('utf8')
      .replace(/^\s+|\s+$/g, ''); //remove empty lines at start and end
    let lines = responseString.split('\n');

    let schemaHeaders = Object.keys(req.class.schema.paths);

    let headerString = schemaHeaders.join(',');

    // check if header matches schema
    if (lines.length <= 1 || lines[0] !== headerString) {
      res.status(400).end(JSON.stringify(
        { errors:
          { error:
            { message: 'CSV header does not match object' }
        }
      }));
    }

    let responseArray = csvToArray(responseString);
    var erroredRows = {};
    var finishedRows = 0;

    for (var i = 1; i < responseArray.length; i++) {
      var object = {};
      for (var j = 0; j < schemaHeaders.length; j++) {
        if (schemaHeaders[j] != '_id' &&
          blacklistRequestAttributes.indexOf(schemaHeaders[j]) >= 0) {
          continue;
        }

        var jsonElement = responseArray[i][j];
        jsonElement = JSON.parse(jsonElement);

        object[schemaHeaders[j]] = jsonElement;
      }

      createWithRow(req, object, i, (result, row) => {
        finishedRows++;
        returnIfFinished(res, finishedRows, responseArray, erroredRows);
      }, (error, row) => {
        finishedRows++;
        erroredRows[row] = error;
        returnIfFinished(res, finishedRows, responseArray, erroredRows);
      });

    }

  },

  function(error) {
    res.status(400).end(JSON.stringify(
      { errors:
        { error:
          { message: 'An unknown error occured. Please try again.' }
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
  req.class.findById(object._id, (err, found) => {
    if (found) { //update
      req.class.update(object)
      .then(function(result) {
          successCallback(result, row);
        }).catch(function(error) {
          errorCallback(error, row);
        });
    } else {
      delete object._id;
      req.class.create(object)
      .then(function(result) {
          successCallback(result, row);
        }).catch(function(error) {
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
    let numErrors = Object.keys(erroredRows).length;
    if (numErrors == 0) {
      res.status(204).end();
    } else {
      var errors = {};
      var numErrorsToDisplay = 5;
      let numExtraErrors = numErrors - numErrorsToDisplay;
      for (var key in erroredRows) {
        if (numErrorsToDisplay == 0) { continue; }

        numErrorsToDisplay--;
        errors['error' + key] = { message: 'Unable to add row: ' +
          key + ' with error: ' + erroredRows[key] };
      }

      if (numExtraErrors > 0) {
        errors.excess = { message: 'And ' + numExtraErrors + ' more errors' };
      }

      res.status(400).end(JSON.stringify({ errors: errors }));
    }
  }
}
