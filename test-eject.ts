import { Application } from '@adonisjs/core/build/standalone';
import SwaggerEject from './build/commands/SwaggerEject.js';
import * as path from 'path';
import * as fs from 'fs';

async function testEject() {
    const appRoot = path.join(__dirname, 'tests', 'dummy-app');

    fs.mkdirSync(path.join(appRoot, 'app'), { recursive: true });
    fs.mkdirSync(path.join(appRoot, 'providers'), { recursive: true });
    fs.mkdirSync(path.join(appRoot, 'contracts'), { recursive: true });
    fs.mkdirSync(path.join(appRoot, 'config'), { recursive: true });

    const app = new Application(appRoot, 'web', {
        providers: [],
        aliases: {
            App: './app'
        }
    });

    await app.setup();

    const command = new SwaggerEject(app, Object.create(null));
    await command.run();

    console.log("Check if test app contains ejected files:");
    console.log("- app/Services/Swagger/SwaggerManager.ts exists:", fs.existsSync(path.join(appRoot, 'app', 'Services', 'Swagger', 'SwaggerManager.ts')));
    console.log("- contracts/swagger.ts exists:", fs.existsSync(path.join(appRoot, 'contracts', 'swagger.ts')));
    console.log("- providers/SwaggerProvider.ts exists:", fs.existsSync(path.join(appRoot, 'providers', 'SwaggerProvider.ts')));

}

testEject().catch(console.error);
