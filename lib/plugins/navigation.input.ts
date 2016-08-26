import { INPUT_OBJECT } from '../introspection';
import { NavigationPlugin, NavigationSection, NavigationItem } from '../utility';
import { NavigationPluginInterface, NavigationSectionInterface, NavigationItemInterface } from '../interface';

export default class NavigationScalars extends NavigationPlugin implements NavigationPluginInterface {

    getSections(buildForType: string) {

        const types: NavigationItemInterface[] = this.schema.types
            .filter(type => type.kind === INPUT_OBJECT)
            .map(type => new NavigationItem(type.name, this.url(type.name), type.name === buildForType));

        if (types.length === 0)
            return [];

        return [
            new NavigationSection('Input Objects', types)
        ];
    }
}