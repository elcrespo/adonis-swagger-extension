import { TypeParser } from './TypeParser';
import { ControllerParser } from './ControllerParser';
import { RouteNode } from '@ioc:Adonis/Core/Route';

export interface SwaggerConfig {
    path: string;
    title: string;
    version: string;
    description?: string;
    tagIndex?: number;
    info?: Record<string, any>;
    snakeCase?: boolean;
    debug?: boolean;
    ignore?: string[];
    preferredPutPatch?: 'PUT' | 'PATCH';
    common?: {
        parameters?: Record<string, any>;
        headers?: Record<string, any>;
    };
    securitySchemes?: Record<string, any>;
    authMiddlewares?: string[];
    defaultSecurityScheme?: string;
    persistAuthorization?: boolean;
    showFullPath?: boolean;
    typesPaths?: string[]; // Specifically for multiple folders
    controllersPaths?: string[]; // Specifically for controller JSDoc parsing
    enabled?: boolean; // Enable or disable swagger routes
}

export class SwaggerManager {
    public static generate(router: any, config: SwaggerConfig): any {
        const paths: Record<string, any> = {};
        const schemas: Record<string, any> = {};

        // 1. Generate Schemas from Types
        if (config.typesPaths && config.typesPaths.length > 0) {
            const typeParser = new TypeParser(config.typesPaths);
            Object.assign(schemas, typeParser.parse());
        }

        // 1.5 Init Controller Parser
        let controllerParser: ControllerParser | null = null;
        if (config.controllersPaths && config.controllersPaths.length > 0) {
            controllerParser = new ControllerParser(config.controllersPaths);
        }

        // 2. Process Routes (Simplistic route conversion to paths)
        const routes: RouteNode[] = router.toJSON();
        for (const routeName in routes) {
            const routeList = routes[routeName];
            // Depending on Adonis version, routes could be grouped by domain or flat array
            const iter = Array.isArray(routeList) ? routeList : [routeList];

            for (const route of iter) {
                if (!route.pattern || route.pattern === '/*') continue; // skip wildcard

                const methods = route.methods.filter((m: string) => m !== 'HEAD');
                const path = route.pattern.replace(/:([a-zA-Z0-9_]+)\??/g, '{$1}'); // transform /users/:id to /users/{id}

                if (!paths[path]) paths[path] = {};

                // Extrapolate tags from pattern (e.g., /api/v1/users -> Users)
                const parts = route.pattern.split('/').filter(Boolean);
                let tag = parts.length > 0 ? parts[0] : 'default';
                if (config.tagIndex !== undefined && parts.length > config.tagIndex) {
                    tag = parts[config.tagIndex];
                }
                tag = tag.charAt(0).toUpperCase() + tag.slice(1);

                for (const method of methods) {
                    const lowerMethod = method.toLowerCase();

                    paths[path][lowerMethod] = {
                        tags: [tag],
                        summary: `${method} ${route.pattern}`,
                        responses: {
                            '200': {
                                description: 'Successful response',
                            },
                        },
                    };

                    // Try to extract JSDocs from the controller
                    if (controllerParser && typeof route.handler === 'string') {
                        // route.handler is typically like "UsersController.index"
                        const handlerParts = route.handler.split('.');
                        if (handlerParts.length === 2) {
                            const controllerName = handlerParts[0];
                            const methodName = handlerParts[1];
                            const methodDocs = controllerParser.getMethodDocs(controllerName, methodName);
                            if (methodDocs) {
                                // Merge the parsed docs into our route definition
                                Object.assign(paths[path][lowerMethod], methodDocs);
                            }
                        }
                    }

                    // Extract Path parameters based on pattern matches
                    const pathParams = [...route.pattern.matchAll(/:([a-zA-Z0-9_]+)(\??)/g)];
                    if (pathParams.length > 0) {
                        paths[path][lowerMethod].parameters = pathParams.map((match) => ({
                            name: match[1],
                            in: 'path',
                            required: match[2] !== '?', // if no '?' it is required
                            schema: { type: 'string' },
                        }));
                    }
                }
            }
        }

        // 3. Construct Final Document
        return {
            openapi: '3.0.0',
            info: {
                title: config.title || 'Adonis API',
                version: config.version || '1.0.0',
                description: config.description || '',
                ...config.info,
            },
            components: {
                schemas,
                securitySchemes: config.securitySchemes || {},
            },
            paths,
        };
    }
}
