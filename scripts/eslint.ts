/*
 * 🐻‍❄️📦 clippy-action: GitHub action to run Clippy, an up-to-date and modern version of actions-rs/clippy
 * Copyright 2023 Noel Towa <cutie@floofy.dev>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { warning, error, startGroup, endGroup } from '@actions/core';
import { __dirname as dirname } from './util/esm';
import { relative } from 'path';
import { ESLint } from 'eslint';
import getLogger from './util/log';
import run from './util/run';

const __dirname = dirname.get();
const paths = ['src/**/*.ts', 'tests/**/*.spec.ts', 'scripts/**/*.ts'] as const;
const isCI = process.env.CI !== undefined;
const log = getLogger('eslint');

run(async () => {
    const eslint = new ESLint({
        useEslintrc: true,
        fix: !isCI
    });

    for (const glob of paths) {
        isCI && startGroup(`Linting for pattern [${glob}]`);
        {
            log.info(`Starting ESLint on pattern [${glob}]`);

            const results = await eslint.lintFiles([glob]);
            for (const result of results) {
                const path = result.filePath.includes('scripts/')
                    ? `scripts/${relative(__dirname, result.filePath).replaceAll('../', '')}`
                    : relative(__dirname, result.filePath).replaceAll('../', '');

                const hasErrors = result.errorCount > 0;
                const hasWarnings = result.warningCount > 0;
                const level = hasErrors ? log.error : hasWarnings ? log.warn : log.success;

                level(path);
                for (const message of result.messages) {
                    if (isCI) {
                        const logSeverity = message.severity === 1 ? warning : error;
                        logSeverity(`${message.message} (${message.ruleId})`, {
                            endColumn: message.endColumn,
                            endLine: message.endLine,
                            file: result.filePath,
                            startLine: message.line,
                            startColumn: message.column
                        });
                    } else {
                        const logSeverity = message.severity === 1 ? log.warn : log.error;
                        logSeverity(
                            `   [${message.ruleId}] ${message.message} (file ${result.filePath}:${message.line}:${message.column})`
                        );
                    }
                }
            }
        }
        isCI && endGroup();
    }
});
