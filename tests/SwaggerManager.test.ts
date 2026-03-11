import { test } from 'node:test';
import * as assert from 'node:assert';
import { SwaggerManager, SwaggerConfig } from '../src/SwaggerManager';
import * as path from 'path';

test('SwaggerManager generates paths and maps URL parameters correctly', () => {
    const config: SwaggerConfig = {
        path: '/docs',
        title: 'Test API',
        version: '1.0.0',
    };

    const mockRouter = {
        toJSON: () => ({
            root: [
                {
                    pattern: '/users',
                    methods: ['GET', 'HEAD'],
                    handler: 'UsersController.index'
                },
                {
                    pattern: '/users/:id',
                    methods: ['GET', 'HEAD'],
                    handler: 'UsersController.show'
                },
                {
                    pattern: '/users/:id?',
                    methods: ['DELETE', 'HEAD'],
                    handler: 'UsersController.destroy'
                }
                
            ]
        })
    };

    const doc = SwaggerManager.generate(mockRouter, config);

    assert.ok(doc, 'Swagger document should be generated');
    assert.strictEqual(doc.openapi, '3.0.0', 'OpenAPI version should be 3.0.0');
    assert.strictEqual(doc.info.title, 'Test API', 'Title should be mapped');
    assert.strictEqual(doc.info.version, '1.0.0', 'Version should be mapped');

    // Root paths check
    assert.ok(doc.paths['/users'], 'Route /users should be included');
    assert.ok(doc.paths['/users']['get'], 'GET /users should exist');
    assert.strictEqual(doc.paths['/users']['get'].tags[0], 'Users', 'Tags should be extracted from pattern');
    
    // Path Parameter parsing and mapping
    assert.ok(doc.paths['/users/{id}'], 'Route /users/:id should be converted to {id}');
    assert.ok(doc.paths['/users/{id}']['get'], 'GET /users/:id should exist');
    
    const showParams = doc.paths['/users/{id}']['get'].parameters;
    assert.strictEqual(showParams?.length, 1, 'Should extract one parameter');
    assert.strictEqual(showParams[0].name, 'id', 'Parameter name should be id');
    assert.strictEqual(showParams[0].in, 'path', 'Parameter should be in path');
    assert.strictEqual(showParams[0].required, true, 'Parameter id should be required');

    // Optional Path Parameter
    const deleteParams = doc.paths['/users/{id}']['delete'].parameters;
    assert.strictEqual(deleteParams?.length, 1, 'Should extract one optional parameter');
    assert.strictEqual(deleteParams[0].name, 'id', 'Parameter name should be id');
    assert.strictEqual(deleteParams[0].in, 'path', 'Parameter should be in path');
    assert.strictEqual(deleteParams[0].required, false, 'Parameter id should be optional if it has ?');
});

test('SwaggerManager parses Controller definitions and merges JSDocs', () => {
    const config: SwaggerConfig = {
        path: '/docs',
        title: 'Test API',
        version: '1.0.0',
        controllersPaths: [path.join(__dirname, 'fixtures/controllers/*.ts')]
    };

    const mockRouter = {
        toJSON: () => ({
            root: [
                {
                    pattern: '/api/v1/users',
                    methods: ['GET', 'HEAD'],
                    handler: 'UsersController.index'
                }
            ]
        })
    };

    const doc = SwaggerManager.generate(mockRouter, config);
    
    assert.ok(doc.paths['/api/v1/users'], 'Route should exist');
    const getDocs = doc.paths['/api/v1/users']['get'];
    
    // Tag should be Api due to pattern extrapolation without tagIndex overrides
    assert.strictEqual(getDocs.tags[0], 'Api', 'Default tag without offset should be Api');

    // Verify JSDocs merge into router paths
    assert.strictEqual(getDocs.summary, 'Get all users', 'Controller JSDocs should override route summary');
    assert.strictEqual(getDocs.description, 'Get a list of all users', 'Controller JSDocs should be added');
    
    // Request/Response mapping from JSDocs
    assert.ok(getDocs.responses['200'], '200 response should exist from Controller tags');
    assert.strictEqual(getDocs.responses['200'].content['application/json'].schema.type, 'array', 'Response schema should be mapped');
    assert.ok(getDocs.parameters?.some((p: any) => p.name === 'sort' && p.in === 'query'), 'Parameters like query string from tags should be mapped');
});

test('SwaggerManager generated with typesPaths parses type declarations', () => {
    const config: SwaggerConfig = {
        path: '/docs',
        title: 'Models API',
        version: '1.0.0',
        typesPaths: [path.join(__dirname, 'fixtures/models/*.ts')]
    };

    const mockRouter = {
        toJSON: () => ({ root: [] })
    };

    const doc = SwaggerManager.generate(mockRouter, config);
    
    // Validate Schemas Extraction
    assert.ok(doc.components, 'Components block must exist');
    assert.ok(doc.components.schemas, 'Schemas block must exist');
    assert.ok(doc.components.schemas['User'], 'User schema should be extracted from typescript files');
});
