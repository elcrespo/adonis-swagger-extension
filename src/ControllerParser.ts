import { Project, MethodDeclaration } from 'ts-morph';
import * as yaml from 'yaml';

export class ControllerParser {
    private project: Project;

    constructor(paths: string[]) {
        this.project = new Project();
        this.project.addSourceFilesAtPaths(paths);
    }

    public getMethodDocs(controllerName: string, methodName: string): any {
        const sourceFiles = this.project.getSourceFiles();

        for (const sourceFile of sourceFiles) {
            const classes = sourceFile.getClasses();
            for (const cls of classes) {
                if (cls.getName() === controllerName || cls.isDefaultExport()) {
                    // If the file exports the class as default or matches the name
                    const methods = cls.getMethods();
                    const method = methods.find(m => m.getName() === methodName);
                    if (method) {
                        return this.parseMethodJSDocs(method);
                    }
                }
            }
        }
        return null;
    }

    private parseMethodJSDocs(method: MethodDeclaration): any {
        const jsdocs = method.getJsDocs();
        if (jsdocs.length === 0) return null;

        const doc = jsdocs[0];
        const tags = doc.getTags();

        const parsedData: any = {
            responses: {}
        };

        let hasRawSwagger = false;

        for (const tag of tags) {
            const tagName = tag.getTagName();
            const rawText = tag.getText().replace(`@${tagName}`, '').trim();
            const text = rawText.replace(/[\r\n]+\s*\*?\s*/g, ' ').trim();

            if (tagName === 'swagger') {
                hasRawSwagger = true;
                try {
                    // Parse raw YAML - use the rawText that still has newlines, and remove leading indents/stars
                    const yamlContent = rawText.replace(/^[ \t]*\*?[ \t]?/gm, '');
                    const parsedYaml = yaml.parse(yamlContent);
                    Object.assign(parsedData, parsedYaml);
                } catch (e) {
                    console.error('[adonis-swagger-extension] Error parsing @swagger yaml:', e);
                }
            } else if (tagName === 'summary') {
                parsedData.summary = text;
            } else if (tagName === 'description') {
                parsedData.description = text;
            } else if (tagName === 'responseBody') {
                // Format: 200 - <Schema> - Description
                // Or: 200 - <Schema[]> - Description
                const match = text.match(/^(\d{3})\s*(?:-\s*)?(?:<([^>]+)>)?\s*(?:-\s*)?(.*)$/);
                if (match) {
                    const status = match[1];
                    const schemaRaw = match[2]; // e.g., UserResponse or UserResponse[]
                    const description = match[3] || '';

                    const responseBlock: any = { description: description || 'Success' };

                    if (schemaRaw) {
                        const isArray = schemaRaw.endsWith('[]');
                        const schemaName = schemaRaw.replace('[]', '');

                        responseBlock.content = {
                            'application/json': {
                                schema: isArray ? {
                                    type: 'array',
                                    items: { $ref: `#/components/schemas/${schemaName}` }
                                } : {
                                    $ref: `#/components/schemas/${schemaName}`
                                }
                            }
                        };
                    }

                    parsedData.responses[status] = responseBlock;
                }
            } else if (tagName === 'requestBody') {
                // Format: <Schema>
                const match = text.match(/^<([^>]+)>$/);
                if (match) {
                    const schemaRaw = match[1];
                    const isArray = schemaRaw.endsWith('[]');
                    const schemaName = schemaRaw.replace('[]', '');

                    parsedData.requestBody = {
                        required: true,
                        content: {
                            'application/json': {
                                schema: isArray ? {
                                    type: 'array',
                                    items: { $ref: `#/components/schemas/${schemaName}` }
                                } : {
                                    $ref: `#/components/schemas/${schemaName}`
                                }
                            }
                        }
                    };
                }
            } else if (tagName === 'paramUse') {
                // Format: @paramUse(id, name)
                // This is a custom macro, but standard OpenAPI parameter passing might be easier:
                // Let's stick to standard @param for now or handle simple query params:
            } else if (tagName === 'paramQuery') {
                // Format: @paramQuery name - type - description
                const match = text.match(/^(\w+)\s*(?:-\s*)?([\w]+)?\s*(?:-\s*)?(.*)$/);
                if (match) {
                    if (!parsedData.parameters) parsedData.parameters = [];
                    parsedData.parameters.push({
                        name: match[1],
                        in: 'query',
                        required: false,
                        schema: { type: match[2] ? match[2].toLowerCase() : 'string' },
                        description: match[3] || ''
                    });
                }
            } else if (tagName === 'paramPath') {
                const match = text.match(/^(\w+)\s*(?:-\s*)?([\w]+)?\s*(?:-\s*)?(.*)$/);
                if (match) {
                    if (!parsedData.parameters) parsedData.parameters = [];
                    parsedData.parameters.push({
                        name: match[1],
                        in: 'path',
                        required: true,
                        schema: { type: match[2] ? match[2].toLowerCase() : 'string' },
                        description: match[3] || ''
                    });
                }
            }
        }

        if (!hasRawSwagger && Object.keys(parsedData.responses).length === 0) {
            // Default response
            parsedData.responses['200'] = { description: 'Successful response' };
        }

        return parsedData;
    }
}
