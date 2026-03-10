import { ApplicationContract } from '@ioc:Adonis/Core/Application';
import { SwaggerManager, SwaggerConfig } from 'App/Services/Swagger/SwaggerManager';
import swaggerUiDist from 'swagger-ui-dist';
import * as fs from 'fs';
import * as path from 'path';

export default class SwaggerProvider {
  constructor(protected app: ApplicationContract) { }

  public register() {
    this.app.container.singleton('Adonis/Addons/Swagger', () => {
      return {
        generate: (router: any, config: SwaggerConfig) => {
          return SwaggerManager.generate(router, config);
        },
      };
    });
  }

  public async boot() {
    const Route = this.app.container.use('Adonis/Core/Route');
    const Config = this.app.container.use('Adonis/Core/Config');
    const swaggerConfig: SwaggerConfig = Config.get('swagger');

    if (!swaggerConfig || swaggerConfig.enabled === false) {
      this.app.logger.warn('Swagger config not found or explicitly disabled. Skipping swagger routes.');
      return;
    }

    // JSON endpoint
    Route.get('/swagger.json', async ({ response }) => {
      const spec = SwaggerManager.generate(Route, swaggerConfig);
      return response.send(spec);
    });

    // UI endpoint
    Route.get('/docs', async ({ response }) => {
      const uiHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Swagger UI</title>
          <link rel="stylesheet" type="text/css" href="/docs/swagger-ui.css" />
          <link rel="icon" type="image/png" href="/docs/favicon-32x32.png" sizes="32x32" />
          <style>
            html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
            *, *:before, *:after { box-sizing: inherit; }
            body { margin:0; background: #fafafa; }
          </style>
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="/docs/swagger-ui-bundle.js"> </script>
          <script src="/docs/swagger-ui-standalone-preset.js"> </script>
          <script>
          window.onload = function() {
            window.ui = SwaggerUIBundle({
              url: "/swagger.json",
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
              ],
              layout: "StandaloneLayout"
            });
          };
          </script>
        </body>
        </html>
      `;
      return response.header('Content-Type', 'text/html').send(uiHtml);
    });

    // Serve static files for Swagger UI from swagger-ui-dist
    Route.get('/docs/*', async ({ request, response }) => {
      const filePath = request.param('*').join('/');
      const distPath = swaggerUiDist.getAbsoluteFSPath();
      const absolutePath = path.join(distPath, filePath);

      if (fs.existsSync(absolutePath)) {
        return response.download(absolutePath);
      }

      return response.status(404).send('Not found');
    });
  }
}
