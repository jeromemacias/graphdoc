import { resolve } from 'path';
import { render } from 'mustache';
import { DocumentPlugin, TypeRef } from './interface';
import { getTypeOf } from './introspection';
import { readTemplate, writeFile, createBuildFolder } from './fs';
import { DataTranslator } from './data';
import { DocumentSchemaPlugin } from './section/print';
import { HTMLDocumentSchemaPlugin } from './section/print.html';

let pack = require('../package.json');

type BuildOptions = {
    schema: GraphQLSchema;
    templateDir: string;
    buildDir: string;
    baseUrl?: string;
    icon?: string;
    plugins?: DocumentSchemaPlugin[];
};

type Partials = {
    index: string,
    main: string,
    nav: string,
}

let defaulIcon = (baseUrl: string) => '<header class="slds-theme--alt-inverse slds-text-heading--medium slds-p-around--large">'
    + '<a href="' + baseUrl + '" >Schema types</a>'
    + '</header>';

let schemaDescription = (nativeSchemaUrl: string) => 'View [native schema](' + nativeSchemaUrl + ')';
let nativeSchemaDescription = (baseUrl: string) => 'View [implemented schema](' + baseUrl + ')';

export function build(options: BuildOptions) {

    let schema = options.schema;
    let baseUrl = options.baseUrl || './';
    let buildDir = resolve(options.buildDir);
    let templateDir = resolve(options.templateDir);
    let icon = options.icon || defaulIcon(baseUrl);
    let documentSections = options.plugins || [];
    let resolveUrl = (t: TypeRef) => {

        let type: TypeRef = getTypeOf(t);
        let name = (type.name as string).toLowerCase();

        if(name[0] === '_' && name[1] === '_')
            return baseUrl + name.slice(2) + '.native.html';

        return baseUrl + name + '.doc.html';
    };

    let plugins: DocumentPlugin[] = [
        // new DocumentSchemaPlugin('GraphQL Schema definition'),
        new HTMLDocumentSchemaPlugin('GraphQL Schema definition', resolveUrl),
    ];

    let dataTranslator = new DataTranslator(schema, plugins, resolveUrl);

    return createBuildFolder(buildDir, templateDir)
        .then(() => Promise.all([
            readTemplate(resolve(templateDir, 'index.mustache'), 'utf8'),
            readTemplate(resolve(templateDir, 'main.mustache'), 'utf8'),
            readTemplate(resolve(templateDir, 'nav.mustache'), 'utf8'),
            readTemplate(resolve(templateDir, 'footer.mustache'), 'utf8'),
        ]))
        .then((templates: string[]) => {
            return {
                index: templates[0],
                main: templates[1],
                nav: templates[2],
                footer: templates[3],
                icon
            };
        })
        .then((partials: Partials) => {

            let data = Object.assign(
                {},
                pack,
                dataTranslator.getNavigationData(),
                dataTranslator.getSchemaData(schema, 'Star Wars Schema', schemaDescription(baseUrl + 'native.html'))
            );

            return writeFile(
                resolve(buildDir, 'index.html'),
                render(partials.index, data, partials)
            ).then(() => partials);
        })
        .then((partials: Partials) => {

            let data = Object.assign(
                {},
                pack,
                dataTranslator.getNavigationData(),
                dataTranslator.getNativeSchemaData(schema, 'Native Schema', nativeSchemaDescription(baseUrl))
            );

            return writeFile(
                resolve(buildDir, 'native.html'),
                render(partials.index, data, partials)
            ).then(() => partials);
        })
        .then((partials: Partials) => {

            let types = schema.getTypeMap();

            let writing = Object
                .keys(types)
                .map(name => {

                    let type = types[name];
                    let path = resolve(buildDir, resolveUrl(type));
                    let data = Object.assign(
                        {},
                        pack,
                        dataTranslator.getNavigationData(type),
                        dataTranslator.getTypeData(type)
                    );

                    return writeFile(
                        path,
                        render(partials.index, data, partials)
                    ).then(() => path);
                });

            return Promise.all(writing);
        })
        .then((result) => console.log(result))
        .catch((err) => console.log(err));
}