import * as sinkStatic from '@adonisjs/sink';
import { ApplicationContract } from '@ioc:Adonis/Core/Application';
import { join } from 'path';

export default async function instructions(
    projectRoot: string,
    app: ApplicationContract,
    sink: typeof sinkStatic
) {
    // Setup config
    const configPath = app.configPath('swagger.ts');
    const templatePath = join(__dirname, 'templates', 'config.txt');
    const configTemplate = new sink.files.MustacheFile(
        projectRoot,
        configPath,
        templatePath
    );

    if (!configTemplate.exists()) {
        configTemplate.apply({}).commit();
        sink.logger.action('create').succeeded('config/swagger.ts');
    } else {
        sink.logger.action('create').skipped('config/swagger.ts');
    }
}
