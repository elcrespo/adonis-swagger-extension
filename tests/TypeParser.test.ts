import { test } from 'node:test';
import * as assert from 'node:assert';
import { TypeParser } from '../src/TypeParser';
import * as path from 'path';

test('TypeParser should extract nested properties from User model', () => {
    const parser = new TypeParser([
        path.join(__dirname, 'fixtures/models/*.ts'),
        path.join(__dirname, 'fixtures/models/generic/*.ts'),
        path.join(__dirname, 'fixtures/contracts/*.ts')
    ]);

    const schemas = parser.parse();

    // Validate User Schema
    assert.ok(schemas['User'], 'User schema should exist');
    assert.strictEqual(schemas['User'].type, 'object');
    assert.ok(schemas['User'].required.includes('id'));
    assert.ok(schemas['User'].required.includes('email'));
    assert.ok(schemas['User'].required.includes('profile'));

    // Profile nested inline object
    const profile = schemas['User'].properties['profile'];
    assert.strictEqual(profile.type, 'object');
    assert.strictEqual(profile.properties['firstName'].type, 'string');
    assert.strictEqual(profile.properties['lastName'].type, 'string'); // Optional but has string type
    assert.ok(!profile.required?.includes('lastName'), 'lastName should be missing from required');
    assert.ok(profile.required?.includes('firstName'), 'firstName should be required');

    // Deeply nested metadata inline object
    const metadata = profile.properties['metadata'];
    assert.strictEqual(metadata.type, 'object');
    assert.strictEqual(metadata.properties['active'].type, 'boolean');

    // Array of primitives
    const roles = schemas['User'].properties['roles'];
    assert.strictEqual(roles.type, 'array');
    assert.strictEqual(roles.items.type, 'string');

    // Validate ComplexResult TypeAlias
    assert.ok(schemas['ComplexResult'], 'ComplexResult should exist');
    const complexData = schemas['ComplexResult'].properties['data'];
    assert.strictEqual(complexData.type, 'array');
    assert.strictEqual(complexData.items.type, 'object');
    assert.strictEqual(complexData.items.properties['itemId'].type, 'string');

    // Validate generic interfaces extending other interfaces
    assert.ok(schemas['UserPaginatedResponse'], 'UserPaginatedResponse should exist');
    assert.strictEqual(schemas['UserPaginatedResponse'].type, 'object');
    const paginatedData = schemas['UserPaginatedResponse'].properties['data'];
    assert.strictEqual(paginatedData.type, 'array');
    assert.strictEqual(paginatedData.items.$ref, '#/components/schemas/User');
});
