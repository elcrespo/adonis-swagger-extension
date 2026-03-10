import { BaseCommand } from '@adonisjs/core/build/standalone';
import * as path from 'path';
import * as fs from 'fs';

export default class SwaggerEject extends BaseCommand {
    public static commandName = 'swagger:eject';
    public static description = 'Eject the Adonis Swagger Extension into your app directory so you can remove the package.';

    public static settings = {
        loadApp: true,
        stayAlive: false,
    };

    private async copyDir(src: string, dest: string) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                await this.copyDir(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }

    public async run() {
        const pkgRoot = path.join(__dirname, '..', '..');
        const appRoot = this.application.appRoot;

        this.logger.info('Ejecting adonis-swagger-extension components...');

        try {
            // 1. Copy src/ to app/Services/Swagger/
            const srcDir = path.join(pkgRoot, 'src');
            const destServicesDir = path.join(appRoot, 'app', 'Services', 'Swagger');

            this.logger.info('Copying source files to app/Services/Swagger...');
            await this.copyDir(srcDir, destServicesDir);
            this.logger.action('copy').succeeded('Copied source files to app/Services/Swagger');

            // 2. Copy adonis-typings/index.ts to contracts/swagger.ts
            const srcTypes = path.join(pkgRoot, 'adonis-typings', 'index.ts');
            const destTypes = path.join(appRoot, 'contracts', 'swagger.ts');

            this.logger.info('Copying typings to contracts/swagger.ts...');
            if (!fs.existsSync(path.dirname(destTypes))) {
                fs.mkdirSync(path.dirname(destTypes), { recursive: true });
            }
            fs.copyFileSync(srcTypes, destTypes);
            this.logger.action('copy').succeeded('Copied typings to contracts/swagger.ts');

            // 3. Copy providers/SwaggerProvider.ts and update imports
            const srcProvider = path.join(pkgRoot, 'providers', 'SwaggerProvider.ts');
            const destProvider = path.join(appRoot, 'providers', 'SwaggerProvider.ts');

            this.logger.info('Copying provider to providers/SwaggerProvider.ts...');
            if (!fs.existsSync(path.dirname(destProvider))) {
                fs.mkdirSync(path.dirname(destProvider), { recursive: true });
            }
            let providerContent = fs.readFileSync(srcProvider, 'utf-8');

            // Replace the local import path with the new app alias path
            providerContent = providerContent.replace(
                /import \{ SwaggerManager, SwaggerConfig \} from '\.\.\/src\/SwaggerManager';/g,
                "import { SwaggerManager, SwaggerConfig } from 'App/Services/Swagger/SwaggerManager';"
            );

            fs.writeFileSync(destProvider, providerContent);
            this.logger.action('copy').succeeded('Copied provider to providers/SwaggerProvider.ts');

            // 4. Instructions
            this.logger.info('');
            this.logger.success('Ejection successful! Please follow these manual steps to complete the process:');
            this.logger.info('1. Install required dependencies:');
            this.logger.info('   npm install ts-morph yaml swagger-ui-dist');
            this.logger.info('2. Update your .adonisrc.json:');
            this.logger.info('   - Remove "adonis-swagger-extension" from providers.');
            this.logger.info('   - Add "./providers/SwaggerProvider" to providers.');
            this.logger.info('3. Uninstall the extension:');
            this.logger.info('   npm uninstall adonis-swagger-extension');
            this.logger.info('');
            this.logger.info('You now own the Swagger generator code inside app/Services/Swagger!');

        } catch (error: any) {
            this.logger.error(`Error during ejection: ${error.message}`);
        }
    }
}
