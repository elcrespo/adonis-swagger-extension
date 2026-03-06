import { test } from 'node:test';
import * as assert from 'node:assert';
import { ControllerParser } from '../src/ControllerParser';
import * as path from 'path';

test('ControllerParser should extract friendly JSDoc annotations', () => {
    const parser = new ControllerParser([
        path.join(__dirname, 'fixtures/controllers/*.ts')
    ]);

    const docs = parser.getMethodDocs('UsersController', 'index');

    assert.ok(docs, 'Docs should be extracted');
    assert.strictEqual(docs.summary, 'Get all users');
    assert.strictEqual(docs.description, 'Get a list of all users');

    // Response Body tests
    assert.ok(docs.responses['200'], '200 response should exist');
    assert.strictEqual(docs.responses['200'].description, 'List of users');
    assert.strictEqual(docs.responses['200'].content['application/json'].schema.type, 'array');
    assert.strictEqual(docs.responses['200'].content['application/json'].schema.items.$ref, '#/components/schemas/UserResponse');

    assert.ok(docs.responses['404'], '404 response should exist');
    assert.strictEqual(docs.responses['404'].description, 'User not found');
    assert.strictEqual(docs.responses['404'].content['application/json'].schema.$ref, '#/components/schemas/ErrorResponse');

    // Request Body test
    assert.ok(docs.requestBody, 'Request body should exist');
    assert.strictEqual(docs.requestBody.required, true);
    assert.strictEqual(docs.requestBody.content['application/json'].schema.$ref, '#/components/schemas/UserRequest');

    // Param Query test
    assert.ok(docs.parameters, 'Parameters should exist');
    assert.strictEqual(docs.parameters.length, 1);
    assert.strictEqual(docs.parameters[0].name, 'sort');
    assert.strictEqual(docs.parameters[0].in, 'query');
});
