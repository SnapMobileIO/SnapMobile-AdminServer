'use strict';

import _ from 'lodash';
import moment from 'moment';
import { awsHelper as awsHelper } from 'snapmobile-aws';
import Promise from 'bluebird';

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
      let convertedString = utils.convertToCsv(result, headers);
      res.set('Content-Type', 'text/csv');
      res.set('Content-Disposition', 'attachment; filename=' + filename);
      res.send(convertedString);
    })
    .catch(utils.handleError(next));
}

export function importFromCsv(req, res, next) {
  console.log(req.body);
  let url = req.body.url;
  let response = awsHelper.getFile(url);
  response.then(function(response) {
    console.log(response.Body.toString('utf8'));
    let responseString = response.Body.toString('utf8')
      .replace(/^\s+|\s+$/g, ''); //remove empty lines at start and end
    var lines = responseString.split('\n');

    let schemaHeaders = Object.keys(req.class.schema.paths);

    let headerString = schemaHeaders.join(',');

    // check if header matches schema
    if (lines.length == 0 || lines[0] != headerString) {
      res.status(400).json({
        message: 'CSV header does not match object'
      });
    }

    var responseArray = utils.CSVToArray(responseString);
    var errorArray = [];

    for (var i = 1; i < responseArray.length; i++) {
      var object = [];
      for (var j = 0; j < schemaHeaders.length; j++) {
        if (blacklistRequestAttributes.indexOf(schemaHeaders[j]) >= 0) {
          continue;
        }

        object[schemaHeaders[j]] = responseArray[i][j];
      }

      req.class.create(object)
        .catch(function(error) {
          errorArray.push(error);
        });

    }

    if (errorArray.length == 0) {
      res.status(204).end();
    } else {
      res.status(400).end('Failed with errors.');
    }

  },

  function(error) {
    console.log('error');
    console.log(response);
  });

}
