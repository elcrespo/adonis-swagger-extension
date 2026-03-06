import { Project, Node, TypeNode, PropertySignature, InterfaceDeclaration, TypeAliasDeclaration, Type } from 'ts-morph';

export class TypeParser {
    private project: Project;

    constructor(paths: string[]) {
        this.project = new Project();
        // Support loading multiple folders/globs
        this.project.addSourceFilesAtPaths(paths);
    }

    public parse(): Record<string, any> {
        const schemas: Record<string, any> = {};
        const sourceFiles = this.project.getSourceFiles();

        for (const sourceFile of sourceFiles) {
            // Interfaces
            const interfaces = sourceFile.getInterfaces();
            for (const iface of interfaces) {
                if (iface.isExported()) {
                    schemas[iface.getName()] = this.parseInterface(iface);
                }
            }

            // Type Aliases
            const typeAliases = sourceFile.getTypeAliases();
            for (const typeAlias of typeAliases) {
                if (typeAlias.isExported()) {
                    schemas[typeAlias.getName()] = this.parseTypeAlias(typeAlias);
                }
            }
        }

        return schemas;
    }

    private parseInterface(node: InterfaceDeclaration, typeArgs?: Type[]): any {
        const schema: any = { type: 'object', properties: {} };
        const required: string[] = [];

        // 1. Process base interfaces recursively
        const baseTypes = node.getBaseTypes();
        for (const baseType of baseTypes) {
            const symbol = baseType.getSymbol() || baseType.getAliasSymbol();
            if (symbol) {
                const baseDecls = symbol.getDeclarations();
                if (baseDecls && baseDecls.length > 0) {
                    const baseNode = baseDecls[0];
                    if (Node.isInterfaceDeclaration(baseNode)) {
                        const baseTypeArgs = baseType.getTypeArguments();
                        const baseSchema = this.parseInterface(baseNode, baseTypeArgs);
                        Object.assign(schema.properties, baseSchema.properties);
                        if (baseSchema.required) {
                            required.push(...baseSchema.required);
                        }
                    }
                }
            }
        }

        // 2. Process current interface properties
        const typeParams = node.getTypeParameters();
        const typeParamsMap: Record<string, Type> = {};

        if (typeArgs && typeArgs.length === typeParams.length) {
            typeParams.forEach((tp, i) => {
                const tpName = tp.getName();
                typeParamsMap[tpName] = typeArgs[i];
            });
        }

        for (const prop of node.getProperties()) {
            const propName = prop.getName();
            let resolvedType: any;

            const propTypeNode = prop.getTypeNode();
            if (propTypeNode && Node.isTypeReference(propTypeNode)) {
                const refName = propTypeNode.getTypeName().getText();
                if (typeParamsMap[refName]) {
                    resolvedType = this.parseType(typeParamsMap[refName]);
                } else {
                    resolvedType = this.parseTypeNode(propTypeNode);
                }
            } else if (propTypeNode && Node.isArrayTypeNode(propTypeNode) && Node.isTypeReference(propTypeNode.getElementTypeNode())) {
                const elemRefType = propTypeNode.getElementTypeNode() as any;
                const refName = elemRefType.getTypeName().getText();
                if (typeParamsMap[refName]) {
                    resolvedType = { type: 'array', items: this.parseType(typeParamsMap[refName]) };
                } else {
                    resolvedType = this.parseTypeNode(propTypeNode);
                }
            } else {
                resolvedType = this.parseTypeNode(propTypeNode);
            }

            schema.properties[propName] = resolvedType;

            if (!prop.hasQuestionToken()) {
                if (!required.includes(propName)) {
                    required.push(propName);
                }
            }
        }

        if (required.length > 0) schema.required = required;
        return schema;
    }

    private parseTypeAlias(node: TypeAliasDeclaration): any {
        const typeNode = node.getTypeNode();
        if (typeNode) {
            return this.parseTypeNode(typeNode);
        }
        return this.parseType(node.getType());
    }

    private parseProperties(properties: PropertySignature[]): any {
        const propertiesMap: Record<string, any> = {};
        const required: string[] = [];

        for (const prop of properties) {
            const name = prop.getName();
            propertiesMap[name] = this.parseTypeNode(prop.getTypeNode());

            if (!prop.hasQuestionToken()) {
                required.push(name);
            }
        }

        const schema: any = {
            type: 'object',
            properties: propertiesMap,
        };

        if (required.length > 0) {
            schema.required = required;
        }

        return schema;
    }

    private parseTypeNode(typeNode?: TypeNode): any {
        if (!typeNode) return { type: 'string' };

        // Handle nested inline object declarations beautifully
        if (Node.isTypeLiteral(typeNode)) {
            return this.parseProperties(typeNode.getProperties() as PropertySignature[]);
        }

        if (Node.isArrayTypeNode(typeNode)) {
            return {
                type: 'array',
                items: this.parseTypeNode(typeNode.getElementTypeNode()),
            };
        }

        if (Node.isUnionTypeNode(typeNode)) {
            return {
                oneOf: typeNode.getTypeNodes().map((n) => this.parseTypeNode(n)),
            };
        }

        if (Node.isIntersectionTypeNode(typeNode)) {
            return {
                allOf: typeNode.getTypeNodes().map((n) => this.parseTypeNode(n)),
            };
        }

        return this.parseType(typeNode.getType(), typeNode);
    }

    private parseType(type: Type, typeNode?: TypeNode): any {
        if (type.isString() || type.isStringLiteral()) return { type: 'string' };
        if (type.isNumber() || type.isNumberLiteral()) return { type: 'number' };
        if (type.isBoolean() || type.isBooleanLiteral()) return { type: 'boolean' };
        if (type.isNull()) return { nullable: true };

        if (type.isArray()) {
            const elementType = type.getArrayElementType();
            if (elementType) {
                return {
                    type: 'array',
                    items: this.parseType(elementType),
                };
            }
        }

        if (type.isUnion()) {
            if (type.isBoolean()) return { type: 'boolean' };
            return {
                oneOf: type.getUnionTypes().map((t) => this.parseType(t)),
            };
        }

        if (type.isObject()) {
            const symbol = type.getSymbol() || type.getAliasSymbol();

            // If the object resolves to a named type (not inline literal), we can just reference it.
            if (symbol) {
                const name = symbol.getName();
                if (name !== '__type' && name !== 'Object' && name !== 'Array') {
                    // We might want to link it if it belongs to our schemas
                    // For standard objects like Date
                    if (name === 'Date') return { type: 'string', format: 'date-time' };

                    return { $ref: `#/components/schemas/${name}` };
                }
            }

            // Try reading properties from standard type checking
            const propertiesMap: Record<string, any> = {};
            const required: string[] = [];
            const props = type.getProperties();

            if (props.length > 0) {
                for (const prop of props) {
                    const propName = prop.getName();
                    // To see if it's optional, we check the symbol flags or declaration
                    const valueDecl = prop.getValueDeclaration();

                    if (valueDecl && Node.isPropertySignature(valueDecl)) {
                        propertiesMap[propName] = this.parseTypeNode(valueDecl.getTypeNode());
                        if (!valueDecl.hasQuestionToken()) {
                            required.push(propName);
                        }
                    } else {
                        // Fallback to type interpretation and assume required
                        let propType;
                        if (valueDecl) {
                            propType = valueDecl.getType();
                        } else {
                            propType = prop.getTypeAtLocation(typeNode || prop.getDeclarations()[0]);
                        }
                        propertiesMap[propName] = this.parseType(propType);

                        // In TS, if it's optional it usually indicates in flags or type union. 
                        // We'll just be conservative.
                        required.push(propName);
                    }
                }
                const schema: any = { type: 'object', properties: propertiesMap };
                if (required.length > 0) schema.required = required;
                return schema;
            }

            // Empty object fallback
            return { type: 'object' };
        }

        // Default string for unknowns
        return { type: 'string' };
    }
}
