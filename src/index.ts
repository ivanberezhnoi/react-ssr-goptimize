import { IExperiment, IVariant } from 'types';
import { useVariant } from './client';
import { experimentMiddleware } from './server';

export {
    experimentMiddleware,
    IExperiment,
    IVariant,
    useVariant,
};
