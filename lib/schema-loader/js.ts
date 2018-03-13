import { Introspection, SchemaLoader } from '../interface';
import { buildSchema, execute, parse, GraphQLSchema } from 'graphql';

import { query as introspectionQuery } from '../utility';
import { resolve } from 'path';

export type TJsSchemaLoaderOptions = {
    schemaFile: string
};

export const jsSchemaLoader: SchemaLoader = async function (options: TJsSchemaLoaderOptions) {

    const schemaPath = resolve(options.schemaFile);
    let schemaModule = require(schemaPath);
    let schema: GraphQLSchema;

    // check if exist default in module
    if (typeof schemaModule === 'object') {
        schemaModule = schemaModule.default
    }

    // check for array of definition
    if (Array.isArray(schemaModule)){
        schema = buildSchema(schemaModule.join(''));

    // check for array array wrapped in a function
    } else if  (typeof schemaModule === 'function')  {
        schema = buildSchema(schemaModule().join(''));

    } else if (typeof schemaModule === 'object' && schemaModule.constructor.name  === 'GraphQLSchema') {
        schema = schemaModule;

    } else {
        throw new Error(`Unexpected schema definition on "${schemaModule}", must be an array, function or GraphQLSchema class`)
    }

    const introspection = await execute(
        schema,
        parse(introspectionQuery)
    ) as Introspection;

    return introspection.data.__schema;
};