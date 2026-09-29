/** Bump when the heuristic, search or rules change so cached calibration results are redone. */
export const SOLVER_VERSION = '0.1.0';

export { allocScratch, hashBoard } from './board';
export { DEFAULT_WEIGHTS, evaluate, WIN_VALUE, LOSS_VALUE, type Weights } from './heuristic';
export {
  Searcher,
  createBot,
  BOT_CONFIGS,
  BOT_NAMES,
  NOVICE_RANDOM,
  type Bot,
  type BotName,
  type SearchConfig,
} from './expectimax';
export { simulate, playGame, type SimResult, type SimOptions, type RunResult } from './simulate';
export { wilson, wilsonHalfWidth, mean } from './stats';
