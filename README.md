# JSONAPI Parse

ES2015 (ES6) module rewrite of https://github.com/mysidewalk/jsonapi-parse for myself.

This library is currently complies and works with [JSON API v1.0](http://jsonapi.org/format/).

## Install
`npm install robo-tommy/jsonapi-parse`

## API Reference

#### jsonapi.parse(input)
| Option | Description                        | Default     |
| ------ | ---------------------------------- | ----------- |
| input  | A JSON string or JavaScript object | `undefined` |

Parses the input provided if it follows the JSON API specification (v1.0). This library currently creates a new object for every nested resource object rather than pointing to the reference of the object form the `included` collection. This is in an effort to reduce difficult to trace bugs.

Currently it prevents circular references by keeping track of the "lineage" as it populates every new resource objects relationships. It will not set anything besides `type` and `id` for the related object.

Returns a new object with at least a `data` and `jsonapi` property. The `data` property should be the parsed version of the object graph included, and the `jsonapi` object should have an indicator for if it has been parsed and any other information the object contained previously.

Passing anything that is not a JSON string or JavaScript object will be returned as it was called with. Passing anything that does not conform to JSON API specification will also be returned as called with.

**Example Usage**
``` javascript

import jsonapi from 'jsonapi-parse';

// JSON API structured object
const input = {
        data: [
            {
                id: '12klj',
                type: 'primary',
                attributes: { key: 'value', property: true }
            }
        ]
    },
    // JSON string of previous object
    stringified = JSON.stringify(input);

// Parsing a normal Javascript Object
jsonapi.parse(input);


// Parsing a JSON string
jsonapi.parse(stringified);

// Returns
// {
//     data: [
//         { id: '12klj', key: 'value', property: true }
//     ],
//     jsonapi: { parsed: true }
// }

```

