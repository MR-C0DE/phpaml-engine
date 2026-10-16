import {compileEval} from './eval/compiler.js';
import {ENGINE_VERSION} from './core/version.js';
globalThis.AMLPhpEval = Object.freeze({version: ENGINE_VERSION, compile: compileEval});
