'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var jsonapi = {};

function flatten(record) {
  return (0, _assign2.default)({}, { links: record.links }, record.attributes, { id: record.id });
}
function isString(value) {
  return Object.prototype.toString.call(value) === '[object String]';
}
function isObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}
function isUndefined(value) {
  return value === undefined;
}
function each(collection, iterator) {
  var key = void 0;
  if (Array.isArray(collection)) {
    for (key = 0; key < collection.length; key += 1) {
      iterator(collection[key], key);
    }
  } else if (isObject(collection)) {
    for (key in collection) {
      if (Object.prototype.hasOwnProperty.call(collection, key)) {
        iterator(collection[key], key);
      }
    }
  }
}
function map(collection, iterator) {
  var transformed = [];
  each(collection, function (value, key) {
    transformed.push(iterator(value, key));
  });
  return transformed;
}
function every(collection) {
  var passes = true;
  each(collection, function (value) {
    if (value !== true) {
      passes = false;
    }
  });
  return passes;
}
function findWhere(collection, matches) {
  var match = void 0;
  each(collection, function (value) {
    var where = map(matches, function (shouldMatch, property) {
      return value[property] === shouldMatch;
    });
    if (every(where)) {
      match = value;
    }
  });
  return match;
}

// Deserialize the JSONAPI formatted object
function deserialize(json) {
  var data = void 0;
  var deserialized = void 0;

  if (Array.isArray(json.data)) {
    data = map(json.data, function (record) {
      populateRelatedFields(record, json.included);
      return flatten(record);
    });
  } else if (isObject(json.data)) {
    populateRelatedFields(json.data, json.included);
    data = flatten(json.data);
  }

  deserialized = {
    data: data,
    jsonapi: json.jsonapi || {}
  };

  if (json.meta) {
    deserialized.meta = json.meta;
  }

  if (json.errors) {
    deserialized.errors = json.errors;
  }

  return deserialized;
}

// Retrieves the record from the included objects that matches the provided relationship
function getMatchingRecord(relationship, included, parents) {
  var circular = void 0;
  var match = void 0;

  circular = findWhere(parents, {
    id: relationship.id,
    type: relationship.type
  });

  if (circular) {
    return relationship;
  }

  match = findWhere(included, {
    id: relationship.id,
    type: relationship.type
  });

  // IF: No match or match is the same as parent, return the relationship information
  if (!match) {
    return relationship;
  }

  populateRelatedFields(match, included, parents);

  return flatten(match);
}

// Populate relations of the provided record from the included objects
function populateRelatedFields(record, included, parents) {
  // IF: Object has relationships, update so this record is listed as a parent
  if (record.relationships) {
    parents = parents ? parents.concat([record]) : [record];
  }

  each(record.relationships, function (relationship, property) {
    // IF: No relationship data, don't add anything
    if (!relationship.data) {
      return;
    }

    // IF: Relationship has multiple matches, create an array for matched records
    // ELSE: Assign relationship directly to the property
    if (Array.isArray(relationship.data)) {
      record.attributes[property] = map(relationship.data, function (data) {
        return getMatchingRecord(data, included, parents);
      });
    } else {
      record.attributes[property] = getMatchingRecord(relationship.data, included, parents);
    }
  });
}

jsonapi.parse = function (response) {
  var json = void 0;
  var parsed = void 0;

  // IF: Response is a string, try to parse as JSON string
  // ELSE IF: Response is a object, reassign to local variable
  // ELSE: Return whatever the input was
  if (isString(response)) {
    try {
      json = global.JSON.parse(response);
    } catch (error) {
      // IF: Not JSON format, return it
      // ELSE: Throw the error
      if (error.name === 'SyntaxError') {
        return response;
      }
      throw error;
    }
  } else if (isObject(response)) {
    json = response;
  } else {
    return response;
  }

  // IF: No required top-level JSON API members, return input
  if (isUndefined(json.data) && isUndefined(json.errors) && isUndefined(json.meta)) {
    return json;
  }

  // IF: Already parsed, return it
  if (json.jsonapi && json.jsonapi.parsed) {
    return json;
  }

  parsed = deserialize(json);
  parsed.jsonapi.parsed = true;

  return parsed;
}; // Flatten the ID of an object with the rest of the attributes on a new object

exports.default = jsonapi;
module.exports = exports['default'];