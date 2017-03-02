const jsonapi = {};

function flatten(record) {
  return Object.assign({}, { links: record.links }, record.attributes, { id: record.id });
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
  let key;
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
  const transformed = [];
  each(collection, (value, key) => {
    transformed.push(iterator(value, key));
  });
  return transformed;
}
function every(collection) {
  let passes = true;
  each(collection, value => { if (value !== true) { passes = false; } });
  return passes;
}
function findWhere(collection, matches) {
  let match;
  each(collection, value => {
    const where = map(
      matches,
      (shouldMatch, property) => {
        return value[property] === shouldMatch;
      }
    );
    if (every(where)) {
      match = value;
    }
  });
  return match;
}

// Deserialize the JSONAPI formatted object
function deserialize(json) {
  let data;
  let deserialized;

  if (Array.isArray(json.data)) {
    data = map(
      json.data,
      record => {
        populateRelatedFields(record, json.included);
        return flatten(record);
      }
    );
  } else if (isObject(json.data)) {
    populateRelatedFields(json.data, json.included);
    data = flatten(json.data);
  }

  deserialized = {
    data,
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
  let circular;
  let match;

  circular = findWhere(
    parents,
    {
      id: relationship.id,
      type: relationship.type
    }
  );

  if (circular) {
    return relationship;
  }

  match = findWhere(
    included,
    {
      id: relationship.id,
      type: relationship.type
    }
  );

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

  each(
    record.relationships,
    (relationship, property) => {
      // IF: No relationship data, don't add anything
      if (!relationship.data) {
        return;
      }

      // IF: Relationship has multiple matches, create an array for matched records
      // ELSE: Assign relationship directly to the property
      if (Array.isArray(relationship.data)) {
        record.attributes[property] = map(
          relationship.data,
          data => {
            return getMatchingRecord(data, included, parents);
          }
        );
      } else {
        record.attributes[property] = getMatchingRecord(
          relationship.data,
          included,
          parents
        );
      }
    }
  );
}

jsonapi.parse = response => {
  let json;
  let parsed;

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
};// Flatten the ID of an object with the rest of the attributes on a new object

export default jsonapi;
