import { Context } from 'koa';

/**
 * Middleware options type signature
 *
 * @param {string} cookieName - name of the cookie to save info about current experiment
 * @param {IExperiment[]} experiments - list of the experiments
 * @param {RegExp} skipExpression - regular expression to filter some requests
 *
 * @export
 * @type ExperimentMiddlewareOptions
 */
export type ExperimentMiddlewareOptions = {
    cookieName: string;
    experiments: IExperiment[];
    skipExpression: RegExp;
    maxAge: Date;
};

/**
 * A/B experiment variant type signature
 *
 * @param {string} name - helper name of the experiment
 * @param {string} weight - distribution weight in range from 0 to 1
 *
 * @export
 * @interface IExperiment
 */
export interface IVariant {
    name: string;
    weight: number;
    component: string;
    id: string;
}

/**
 * A/B experiment type signature
 *
 * @param {string} id - GoogleOptimize experiment id
 * @param {string} name - helper name of the experiment
 * @param {(...args: any[]) => boolean} [isEligible] - helps to exclude experiment on certain conditions
 * @param {IVariant[]} variants - list of variants of the experiment
 *
 * @export
 * @interface IExperiment
 */
export interface IExperiment {
    id: string;
    name: string;
    isEligible?: () => boolean;
    variants: IVariant[];
    activeVariant?: IVariant;
    weight: number;
}

export interface ICookie {
    name: string;
    value: string;
    options: {
        httpOnly: boolean;
        expires: Date;
    };
}
