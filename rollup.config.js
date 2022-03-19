import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import strip from '@rollup/plugin-strip';
import transformPaths from '@zerollup/ts-transform-paths';
import builtins from 'rollup-plugin-node-builtins';
import external from 'rollup-plugin-peer-deps-external';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';
import { version } from './package.json';



const DIST_FOLDER = 'dist';

export default commandLineArgs => {
    const productionPlugins = [
        strip(),
        terser({
            output: { comments: false }
        }),
    ];

    const developmentPlugins = [];

    const commonPlugins = [
        replace({
            preventAssignment: true,
            values: {
                "VERSION": version
            }
        }),
        external(),
        builtins(),
        resolve({
            preferBuiltins: false
        }),
        commonjs({
            include: /node_modules/,
        }),
        json(),
        typescript({
            typescript: require('typescript'),
            cacheRoot: '.cache',
            objectHashIgnoreUnknownHack: true,
            tsconfig : './tsconfig.json',
            transformers: [service => transformPaths(service.getProgram())],
        })
    ];

    return {
        input: './src/index.ts',
        output: [{
            file: `./${DIST_FOLDER}/index.js`,
            format: 'cjs',
            sourcemap: true
        }],
        treeshake: process.env.NODE_ENV === 'production',
        onwarn(warning, warn) {
            if (warning.code === 'EVAL' || warning.code === 'CIRCULAR_DEPENDENCY') return;
            warn(warning);
        },
        plugins: [
            ...commonPlugins,
            ...(process.env.NODE_ENV === 'production' ? productionPlugins : developmentPlugins)
        ]
    }
}
