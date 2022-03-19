import { useRef } from 'react';
import { IExperiment, IVariant } from 'types';

type TComponent = React.FunctionComponent | React.ComponentClass;

export const useVariant = (experiment: IExperiment, components: TComponent[]): TComponent | null => {
    const activeComponent = useRef<TComponent | null>(null);

    if (activeComponent.current) return activeComponent.current;
    if (!experiment) return components[0];

    const findComponent = (variant: IVariant | undefined): TComponent | undefined => {
        if (!variant) return;
        return components.find((c: TComponent) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const component = (c as any).WrappedComponent || c;
            return (component.displayName || component.name) === variant.component;
        });
    };

    activeComponent.current = findComponent(experiment.activeVariant) || null;

    return activeComponent.current;
};
