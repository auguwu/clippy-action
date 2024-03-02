/*
 * 🐻‍❄️📦 clippy-action: GitHub action to run Clippy, an up-to-date and modern version of actions-rs/clippy
 * Copyright 2023-2024 Noel Towa <cutie@floofy.dev>
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

import { getClippyOutput, renderMessages, type Renderer } from '../src/clippy';
import { beforeEach, afterAll, expect, test } from 'bun:test';
import type { AnnotationProperties } from '@actions/core';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { which } from '@actions/io';

const kRenderQueue: Record<
    'error' | 'info' | 'warning',
    Array<[{ properties?: AnnotationProperties; rendered: string }]>
> = {
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

test(
    'clippy :: error + warnings',
    async () => {
        const cargo = await which('cargo', true);
        const [exitCode, pieces] = await getClippyOutput(
            {
                'working-directory': resolve(import.meta.dir, '__fixtures__', 'unbased-codebase'),
                'all-features': false,
                'github-token': 'blahblahblah',
                'check-args': [],
                forbid: [],
                allow: [],
                deny: [],
                warn: [],
                args: []
            },
            cargo
        );

        expect(exitCode).toBe(101 /* the code couldn't be compiled correctly */);
        await renderMessages(pieces, kMockedRenderer);
        expect(kRenderQueue.warning.length).toBe(1);
        expect(kRenderQueue.error.length).toBe(1);
        expect(kRenderQueue.info.length).toBe(0);
        expect(kRenderQueue).toMatchSnapshot();

        const warning = kRenderQueue.warning[0];
        expect(warning.length).toBe(1);

        const warningInfo = warning[0];
        expect(warningInfo.rendered).toContain('warning: variable does not');

        const error = kRenderQueue.error[0];
        expect(error.length).toBe(1);

        const errorInfo = error[0];
        expect(errorInfo.rendered).toContain('error: equal expressions as operands to `==`');
    },
    { timeout: 30000 }
);

test('clippy :: no warning or error messages', async () => {
    const cargo = await which('cargo', true);
    const [exitCode, pieces] = await getClippyOutput(
        {
            'working-directory': resolve(import.meta.dir, '__fixtures__', 'no-clippy-error'),
            'all-features': false,
            'github-token': 'blahblahblah',
            'check-args': [],
            forbid: [],
            allow: [],
            deny: ['warnings'],
            warn: [],
            args: []
        },
        cargo
    );

    expect(exitCode).toBe(0);
    await renderMessages(pieces, kMockedRenderer);

    expect(kRenderQueue).toMatchSnapshot();
});
