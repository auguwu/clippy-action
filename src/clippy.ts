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

import { type AnnotationProperties, group, info, error, warning, debug } from '@actions/core';
import { Stopwatch, assertIsError, hasOwnProperty } from '@noelware/utils';
import { type ExecOptions, exec, getExecOutput } from '@actions/exec';
import type { Inputs } from './inputs';

export interface Renderer {
    warning(message: string, properties: AnnotationProperties): void;
    error(message: string, properties: AnnotationProperties): void;
    info(message: string): void;
}

const kDefaultRenderer: Renderer = {
    warning,
    error,
    info
};

export const getClippyOutput = (inputs: Inputs, cargoPath: string): Promise<[exitCode: number, data: string[]]> =>
    group('Executing `cargo clippy`...', async () => {
        //const stopwatch = Stopwatch.createStarted();
        const args = ['clippy'];

        if (inputs.forbid.length) {
            args.push(...inputs.forbid.map((forbid) => `-F${forbid}`));
        }

        if (inputs.deny.length) {
            args.push(...inputs.deny.map((deny) => `-D${deny}`));
        }

        if (inputs.warn.length) {
            args.push(...inputs.warn.map((allowed) => `-W${allowed}`));
        }

        if (inputs.allow.length) {
            args.push(...inputs.allow.map((allowed) => `-A${allowed}`));
        }

        const data: string[] = [];
        const execOptions: ExecOptions = {
            windowsVerbatimArguments: true,
            ignoreReturnCode: true,
            failOnStdErr: false,
            //silent: true,
            listeners: {
                stdline(piece) {
                    console.log(piece);

                    try {
                        JSON.parse(piece);
                        data.push(piece);
                    } catch (e) {
                        assertIsError(e);

                        // we don't care if invalid json
                        // was passed, we won't include it
                        // anyway.
                    }
                }
            }
        };

        if (inputs['working-directory'] !== undefined) {
            execOptions.cwd = inputs['working-directory'];
        }

        const exitCode = await exec(cargoPath, args, execOptions);
        //const endTime = stopwatch.stop();

        //info(`Took ${endTime} to run \`cargo clippy ${args.join(' ')}\``);
        return [exitCode, data];
    });

export const renderMessages = (pieces: string[], renderer: Renderer = kDefaultRenderer) => {
    for (const piece of pieces) {
        const data = JSON.parse(piece);
        if (!hasOwnProperty(data, 'reason')) {
            debug(`Skipping payload due to no 'reason' output\n${piece}`);
        }

        if (!hasOwnProperty(data, 'message')) {
            debug(`Skipping payload due to no 'message' output\n${piece}`);
            continue;
        }

        if (data.reason !== 'compiler-message') {
            debug(`Skipping payload due to 'reason' !== 'compiler-message'\n${piece}`);
            continue;
        }

        if (!hasOwnProperty(data, 'target')) {
            debug(`Skipping payload due to no 'target' output\n${piece}`);
            continue;
        }

        const message = data.message;
        let type: 'info' | 'warning' | 'error';
        let method: any;

        switch (message.level) {
            case 'help':
            case 'note':
                type = 'info';
                method = renderer.info;

                break;

            case 'warning':
                type = 'warning';
                method = renderer.warning;

                break;

            case 'error':
                type = 'error';
                method = renderer.error;

                break;

            case 'error: internal compiler error':
            default:
                error(
                    'Received a internal compiler error OR an unknown message type, view this in debug mode to view the payload'
                );

                debug(piece);
                process.exit(1);
        }

        const primarySpan = message.spans.find((span: any) => hasOwnProperty(span, 'is_primary') && span.is_primary);
        if (primarySpan !== undefined) {
            const args =
                type === 'info'
                    ? [message.rendered]
                    : [
                          message.rendered,
                          {
                              startColumn: primarySpan.column_start,
                              endColumn: primarySpan.column_end,
                              startLine: primarySpan.line_start,
                              endLine: primarySpan.line_end,
                              title: message.message,
                              file: data.target.src_path
                          } satisfies AnnotationProperties
                      ];

            method.apply(null, args);
        } else {
            method(message.rendered);
        }
    }
};
