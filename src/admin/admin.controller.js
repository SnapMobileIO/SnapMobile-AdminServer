'use strict';

import _ from 'lodash';

// TODO: Add frozen properties that should not be returned (e.g., password, salt, etc.)

var utils;

export function setUtils(_utils) {
  utils = _utils;
}

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
        .then(utils.respondWithResult(res))
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
    .then(utils.respondWithResult(res))
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
    .then(utils.respondWithResult(res))
    .catch(utils.handleError(next));
}

/**
 * Updates an existing document in the DB
 */
export function update(req, res, next) {
  req.class.findOne({ _id: req.params.id })
    .then(utils.handleEntityNotFound(res))
    .then(result => {
      if (req.body._id) {
        delete req.body._id;
      }

      let updated = _.assign(result, req.body);
      return updated.save();
    })
    .then(utils.respondWithResult(res))
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
