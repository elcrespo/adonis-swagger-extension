declare module 'adonis-swagger-extension' {
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
        public static generate(router: any, config: SwaggerConfig): any;
    }
}
