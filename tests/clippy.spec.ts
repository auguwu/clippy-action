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

import { type Renderer, getClippyOutput, renderMessages } from '../src/clippy';
import { beforeEach, test, expect, afterAll } from 'vitest';
import type { AnnotationProperties } from '@actions/core';
import { mockProcessStdout } from 'vitest-mock-process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { which } from '@actions/io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const kRenderQueue: Record<'info' | 'warning' | 'error', [{ rendered: string; properties?: AnnotationProperties }][]> =
    {
        warning: [],
        error: [],
        info: []
    };

const kMockedRenderer: Renderer = {
    warning(message, properties) {
        kRenderQueue.warning.push([{ rendered: message, properties }]);
    },
    error(message, properties) {
        kRenderQueue.error.push([{ rendered: message, properties }]);
    },
    info(message) {
        kRenderQueue.info.push([{ rendered: message }]);
    }
};

const flushRenderQueue = () => {
    for (const prop of Object.keys(kRenderQueue)) {
        kRenderQueue[prop] = [];
    }
};

// We only mock process.stdout to clear out @actions/exec and @actions/core logs
const stdoutMock = mockProcessStdout();
afterAll(() => {
    stdoutMock.mockReset();
});

beforeEach(() => {
    // Flush the renderer message queue so we get fresh instances
    // in each test.
    flushRenderQueue();
});

test(
    'clippy error + warning',
    async () => {
        const cargoPath = await which('cargo', true);
        const [exitCode, pieces] = await getClippyOutput(
            {
                'working-directory': resolve(__dirname, '__fixtures__', 'unbased-codebase'),
                'all-features': false,
                'github-token': 'blahblahblah',
                'check-args': [],
                forbid: [],
                allow: [],
                deny: [],
                warn: [],
                args: []
            },
            cargoPath
        );

        expect(exitCode).toBe(101 /* the code couldn't be compiled correctly */);
        await renderMessages(pieces, kMockedRenderer);
        expect(kRenderQueue.warning.length).toBe(1);
        expect(kRenderQueue.error.length).toBe(1);
        expect(kRenderQueue.info.length).toBe(0);

        const warning = kRenderQueue.warning[0];
        expect(warning.length).toBe(1);

        const warningInfo = warning[0];
        expect(warningInfo.rendered).toContain('warning: variable does not');

        const error = kRenderQueue.error[0];
        expect(error.length).toBe(1);

        const errorInfo = error[0];
        expect(errorInfo.rendered).toContain('error: equal expressions as operands to `==`');
    },
    { timeout: 300000 /* 5 minutes should be good */ }
);

test('can we get no warning and error messages in __fixtures__/no-clippy-error', async () => {
    const cargoPath = await which('cargo');
    const [exitCode, pieces] = await getClippyOutput(
        {
            'working-directory': resolve(__dirname, '__fixtures__', 'no-clippy-error'),
            'all-features': false,
            'github-token': 'blahblahblah',
            'check-args': [],
            forbid: [],
            allow: [],
            deny: [],
            warn: [],
            args: []
        },
        cargoPath
    );

    expect(exitCode).toBe(0);
    await renderMessages(pieces, kMockedRenderer);

    expect(kRenderQueue).toMatchSnapshot();
});
