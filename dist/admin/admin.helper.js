'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertToCsv = convertToCsv;
exports.csvToArray = csvToArray;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param  {Array} result Array of objects - results from database query
 * @param  {Array} headers Schema properties
 * Converts data to CSV string
 */
function convertToCsv(result, headers) {
  var columnDelimiter = ',';
  var lineDelimiter = '\n';
  var convertedString = '';
  var jsonString = '';

  convertedString += headers.join(columnDelimiter);
  convertedString += lineDelimiter;

  // Build CSV string by iterating over each object and each header adding the data to the converted string
  for (var i = 0; i < result.length; i++) {
    for (var x = 0; x < headers.length; x++) {

      if (x > 0) {
        convertedString += columnDelimiter;
      };

      // Undefined will show up in the CSV as 'undefined', we want ''
      if (result[i][headers[x]] === undefined || result[i][headers[x]] === null) {
        convertedString += '';

        // Objects will be added to the CSV as '[Object object]', we want the object
      } else if (!!result[i][headers[x]] && (result[i][headers[x]].constructor === Array || result[i][headers[x]].constructor === Object)) {

        // Stringify any objects that are in the db
        // Single quotes and hanging quotes will break CSV, replace with ""
        jsonString = JSON.stringify(result[i][headers[x]]);
        convertedString += '"' + String(jsonString).replace(/\"/g, '""').replace(/'/g, '""').replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '""$2"": ') + '"';

        // Dates should be converted to a better format
      } else if (result[i][headers[x]].constructor === Date) {
        convertedString += (0, _moment2.default)(result[i][headers[x]]).format('YYYY-MM-DD HH:mm:ss');

        // Double quotes and hanging quotes will break our CSV, replace with "" will fix it
      } else {
        convertedString += '"' + String(result[i][headers[x]]).replace(/\"/g, '""') + '"';
      }
    }

    convertedString += lineDelimiter;
  }

  return convertedString;
}

/**
 * Helper function to convert a CSV to array
 * @param {String} strData The CSV String
 * @param {String} strDelimiter Optional delimiter
 */
function csvToArray(strData) {
  var strDelimiter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ',';

  // Create a regular expression to parse the CSV values.
  var objPattern = new RegExp(

  // Delimiters.
  '(\\' + strDelimiter + '|\\r?\\n|\\r|^)' +

  // Quoted fields.
  '(?:"([^"]*(?:""[^"]*)*)"|' +

  // Standard fields.
  '([^"\\' + strDelimiter + '\\r\\n]*))', 'gi');

  // Create an array to hold our data. Give the array
  // a default empty first row.
  var arrData = [[]];

  // Create an array to hold our individual pattern
  // matching groups.
  var arrMatches = null;

  // Keep looping over the regular expression matches
  // until we can no longer find a match.
  while (arrMatches = objPattern.exec(strData)) {

    // Get the delimiter that was found.
    var strMatchedDelimiter = arrMatches[1];

    // Check to see if the given delimiter has a length
    // (is not the start of string) and if it matches
    // field delimiter. If id does not, then we know
    // that this delimiter is a row delimiter.
    if (strMatchedDelimiter.length && strMatchedDelimiter != strDelimiter) {

      // Since we have reached a new row of data,
      // add an empty row to our data array.

      arrData.push([]);
    }

    // Now that we have our delimiter out of the way,
    // let's check to see which kind of value we
    // captured (quoted or unquoted).
    if (arrMatches[2]) {
      // We found a quoted value. When we capture
      // this value, unescape any double quotes.
      var strMatchedValue = arrMatches[2].replace(new RegExp('""', 'g'), '"');
    } else {
      // We found a non-quoted value.
      var strMatchedValue = arrMatches[3];
    }

    // Now that we have our value string, let's add
    // it to the data array.
    arrData[arrData.length - 1].push(strMatchedValue);
  }

  return arrData;
}