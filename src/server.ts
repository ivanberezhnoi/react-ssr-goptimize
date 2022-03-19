import { Context, Next } from 'koa';
import { ExperimentMiddlewareOptions, ICookie, IExperiment, IVariant } from 'types';
import weightedRandom from 'weighted-random';

const DEFAULT_OPTIONS: ExperimentMiddlewareOptions = {
    cookieName: 'vm_goptimize_experiment',
    skipExpression: /(bot|spider|crawler)/i,
    experiments: [],
    maxAge: new Date(new Date().getTime() + 365 * 24 * 60 * 60 * 1000),
};

/**
 * Chooses experiments and active variants
 *
 * @param {IExperiment[]} experiments - experiments to set
 *
 * @returns IExperiment[]
 */
function chooseExperiments(experiments: IExperiment[]) {
    return experiments.reduce((acc: IExperiment[], exp: IExperiment) => {
        if (exp.isEligible && !exp.isEligible()) return acc;
        if (Math.random() > exp.weight) return acc;

        const newExperiment = { ...exp };
        delete newExperiment.isEligible;
        const variantWeights = newExperiment.variants.map(variant => (variant.weight === undefined ? 1 : variant.weight)),
            index = weightedRandom(variantWeights),
            activeVariant: IVariant = newExperiment.variants[index];

        acc.push({ ...newExperiment, activeVariant });
        return acc;
    }, []);
}

/**
 * Determines should we skip experiment assignmentor not
 *
 * @param {Context} ctx - server context instance
 * @param {RegExp} skipExpression - regular expression skip logic based on
 *
 * @returns boolean
 */
function skipAssignment(ctx: Context, skipExpression: RegExp) {
    return ctx.req && ctx.req.headers && ctx.req.headers['user-agent'] && ctx.req.headers['user-agent'].match(skipExpression);
}

/**
 * Get cookie to set
 *
 * @param {IExperiment[]} experiments - active experiments
 * @param {string} cookieName
 * @param {Date} maxAge - cookie expires date
 *
 * @returns {}
 */

function getCookieParams(experiments: IExperiment[], cookieName: string, maxAge: Date) {
    const experimentsCookie = experiments.reduce((res, exp) => (res += `${exp.id}.${exp.activeVariant?.id}!`), '').replace(/!$/, '');
    return {
        name: cookieName,
        value: experimentsCookie,
        options: {
            httpOnly: false,
            expires: maxAge,
        },
    };
}

/**
 * Server middleware to distribute users in A/B experiments
 *
 * @param {ExperimentMiddlewareOptions} options
 * @returns Promise<void>
 */
export const experimentMiddleware = (options: ExperimentMiddlewareOptions) => async (ctx: Context, next: Next) => {
    const { cookieName, experiments, skipExpression, maxAge } = { ...DEFAULT_OPTIONS, ...options };
    const initCookie = ctx.query['initCookie'];
    let cookie = ctx.cookies.get(cookieName);

    // Cookie from ssr
    if (!cookie && initCookie) {
        cookie = (initCookie as string).split('=')[1];
    }

    let activeExperiments: IExperiment[] = [];
    let newCookie: ICookie | null = null;

    // Try restore experiment data from cookie
    if (cookie) {
        activeExperiments = cookie
            .split('!')
            .map(c => {
                let result: IExperiment = {} as IExperiment;
                const [cookieExperiment, cookieVariant] = c.split('.'),
                    exp = experiments.find(e => e.id === cookieExperiment);
                if (exp) {
                    if (exp.isEligible && !exp.isEligible()) return result;
                    result = {
                        ...exp,
                        activeVariant: exp.variants.find((v: IVariant) => v.id === cookieVariant) || exp.variants.find(v => v.id === '0'),
                    };
                    delete result.isEligible;
                }
                return result;
            })
            .filter(e => e !== undefined && Object.keys(e).length);

        // Missmatch experiments in options and cookie
        if (activeExperiments.length !== experiments.length) {
            const newExperiments: IExperiment[] = experiments.filter(exp => !activeExperiments.find(e => e.id === exp.id));
            activeExperiments = [...activeExperiments, ...chooseExperiments(newExperiments)];

            const experimentCookie = getCookieParams(activeExperiments, cookieName, maxAge);
            if (cookie !== experimentCookie.value) {
                newCookie = experimentCookie;
            }
        }

        ctx.state.experiments = { activeExperiments, newCookie };
        await next();
        return;
    }

    // Check availability for set experiment by regexp
    if (!skipAssignment(ctx, skipExpression)) {
        // Choose experiments
        activeExperiments = chooseExperiments(experiments);
        newCookie = getCookieParams(activeExperiments, cookieName, maxAge);
    }

    ctx.state.experiments = { activeExperiments, newCookie };
    await next();
};
