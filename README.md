# Adonis Swagger Extension

A powerful, AST-driven Swagger/OpenAPI v3 generator package for AdonisJS v5. 

Inspired by `adonis-autoswagger`, this package natively supports and shines in:
- **Multiple folder configurations** to load your TypeScript interfaces and types across your entire codebase.
- **Nested inline declarations** in your models and interfaces! Unlike other generators which require flat/standalone models, this leverages the `ts-morph` AST parser to seamlessly convert deeply nested and inline objects into proper Swagger sub-schemas.
- **Clean Controller Annotations**: Simple JSDoc tags like `@responseBody` and `@requestBody` that compile down to complex OpenAPI specs securely, with full YAML fallback via `@swagger`.

---

## 🚀 Installation

Install the package using npm:

```bash
npm i adonis-swagger-extension
```

Next, configure the provider and generate the starter configuration file:

```bash
node ace configure adonis-swagger-extension
```

This will create a `config/swagger.ts` file in your application.

---

## ⚙️ Configuration

In your `config/swagger.ts`, configure the `typesPaths` and `controllersPaths` arrays. You can pass multiple globs to specify which folders contain your interfaces, types, and controllers:

```typescript
// config/swagger.ts
import { SwaggerConfig } from 'adonis-swagger-extension/build/src/SwaggerManager';

export default {
  path: __dirname + '/../',
  title: 'My Awesome API',
  version: '1.0.0',
  description: 'API Documentation with deeply nested standard TypeScript types',
  tagIndex: 2, // Used to extract tags from route paths (e.g., /api/v1/users -> Users)
  info: {
    title: 'Awesome API',
    version: '1.0.0',
    description: ''
  },
  // Disable swagger in production
  // enabled: process.env.NODE_ENV !== 'production',
  // Add as many type/interface source folders as you need!
  typesPaths: [
    'app/Models/**/*.ts',
    'app/DTOs/**/*.ts',
    'contracts/**/*.ts',
  ],
  // Point to your controllers for method JSDoc parsing
  controllersPaths: [
    'app/Controllers/Http/**/*.ts'
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  },
} as SwaggerConfig;
```

### Note on BodyParser (`config/bodyparser.ts`)

**`adonis-swagger-extension` works completely independently of your body parser.**

This extension uses `ts-morph` to purely analyze your TypeScript code statically. It generates the OpenAPI JSON spec by reading your code (AST) and does not intercept network requests or require runtime parsing. You do not need to modify your `config/bodyparser.ts` or add unique middleware for this extension to function. 

However, remember that when testing requests from the Swagger UI (`/docs`), those requests will hit your typical Adonis application endpoints. If your API expects JSON, `multipart/form-data`, or raw XML, make sure your standard Adonis body parser handles those types properly for your actual API to function!

---

## 🧠 Defining Types & Interfaces

This package uses `ts-morph` (a wrapper around the TypeScript compiler API) internally. Whenever you declare an **exported** type or interface inside any of your `typesPaths`, the AST parser picks it up and recursively builds an OpenAPI JSON representation. 

This means you can write **complex nested inline types** natively without workarounds:

```typescript
export interface UserResponse {
  id: number;
  email: string;
  profile: {
    firstName: string;
    lastName?: string;
    metadata: {
      active: boolean;
      lastLogin?: Date;
    }
  };
  roles: string[];
}
```

The Swagger UI will accurately represent your deep objects, automatically handling required/optional (`?`) fields seamlessly!

---

## 📖 Controller Annotations (JSDoc)

Similar to standard Adonis patterns, your controllers can use custom, simplistic JSDoc tags to mount schemas into your OpenAPI paths. The extension automatically maps your routes to these methods.

### Supported Tags

#### 1. `@summary` and `@description`
Basic route information.
```typescript
/**
 * @summary Get all users
 * @description Retrieves a paginated list of all active users in the system.
 */
```

#### 2. `@responseBody`
Format: `<statusCode> - <SchemaType> - <Description>`
You can specify `[]` after the schema type to indicate an array.

```typescript
/**
 * @responseBody 200 - <UserResponse[]> - List of retrieved users
 * @responseBody 404 - <ErrorResponse> - User not found
 */
```

#### 3. `@requestBody`
Format: `<SchemaType>`
Defines the expected JSON payload schema for POST/PUT/PATCH requests.

```typescript
/**
 * @requestBody <CreateUserPayload>
 */
```

#### 4. `@paramPath` and `@paramQuery`
Format: `<name> - <type> - <description>`
Define query strings and path parameters.

```typescript
/**
 * @paramPath id - integer - The ID of the user
 * @paramQuery status - string - Filter users by status (active/inactive)
 */
```

#### 5. `@swagger` (Raw YAML)
If you need complex, highly specific OpenAPI features that the custom tags don't cover, use the raw `@swagger` tag to inject valid YAML directly.

```typescript
/**
 * @swagger
 * responses:
 *   200:
 *     description: Custom complex response
 *     content:
 *       application/xml:
 *         schema:
 *           $ref: '#/components/schemas/XMLResponse'
 */
```

### Complete Controller Example

```typescript
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

export default class UsersController {
  /**
   * @summary Get a user by ID
   * @description Fetches a user profile along with their metadata.
   * @paramPath id - integer - The user ID
   * @paramQuery includeDeleted - boolean - Include deleted users in search
   * @responseBody 200 - <UserResponse> - The specified user
   * @responseBody 404 - <ErrorResponse> - User not found
   */
  public async show({ request, response }: HttpContextContract) {
    // Controller logic...
  }
}
```

---

## 🏃‍♂️ Ejecting the Extension

If you want complete control over your Swagger generator, or simply don't want `adonis-swagger-extension` hanging around your `package.json` forever, you can **eject** the code natively into your app!

```bash
node ace swagger:eject
```

Running this command will:
1. Copy all the TS parser logic (`SwaggerManager`, `TypeParser`, `ControllerParser`) directly into `app/Services/Swagger/`.
2. Copy the extension's types into `contracts/swagger.ts`.
3. Create a decoupled `providers/SwaggerProvider.ts` in your app.

After ejection, simply install the underlying dependencies (`ts-morph`, `swagger-ui-dist`, `yaml`), register the local provider in your `.adonisrc.json`, and uninstall the package:

```bash
npm uninstall adonis-swagger-extension
```

You now own the entire Swagger generator source code!

---

## 👀 Viewing the Documentation

The package automatically mounts two routes in your Adonis application at runtime:

1. **`/docs`**: Displays the interactive Swagger UI interface.
2. **`/swagger.json`**: Serves the raw, auto-generated OpenAPI v3 JSON payload.

Simply boot up your Adonis app (`npm run dev`) and visit **`http://localhost:3333/docs`** in your browser to interact with your complete API documentation!
