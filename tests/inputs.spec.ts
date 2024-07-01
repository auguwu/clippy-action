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

import { type Inputs, getInputs } from '../src/inputs';
import { beforeEach, expect, test } from 'bun:test';

const resetEnv = () => {
    process.env = Object.keys(process.env).reduce((acc, curr) => {
        if (!curr.startsWith('INPUT_')) {
            acc[curr] = process.env[curr];
        }

        return acc;
    }, {});

    setInput('github-token', 'waffle');
};

beforeEach(resetEnv);

test('resolve default inputs', async () => {
    const inputs = await getInputs();
    expect(inputs).not.toBeNull();

    expect(inputs!['working-directory']).toBeUndefined();
    expect(inputs!['check-args'].length).toBe(0);
    expect(inputs!['all-features']).toBeFalsy();
    expect(inputs!.forbid.length).toBe(0);
    expect(inputs!.allow.length).toBe(0);
    expect(inputs!.deny.length).toBe(0);
    expect(inputs!.warn.length).toBe(0);
    expect(inputs!.args.length).toBe(0);
});

// TODO(@auguwu): how to mock process.stdout/stderr in bun
// test("don't resolve invalid inputs", async () => {
//     // forbid
//     const mockStdout = mockProcessStdout();
//     setInput('forbid', 'unused_mut');
//     setInput('args', '-Funused_mut');

//     let inputs = await getInputs();
//     expect(inputs).toBeNull();
//     expect(mockStdout).toHaveBeenCalledOnce();
//     expect(mockStdout).toHaveBeenCalledWith('::error::To append new forbidden lints, use the `forbid` action input.\n');

//     mockStdout.mockReset();

//     // deny
//     resetEnv();
//     setInput('deny', 'unused_mut');
//     setInput('args', '-Dunused_mut,-Dboxed_local');

//     inputs = await getInputs();
//     expect(inputs).toBeNull();
//     expect(mockStdout).toHaveBeenCalledOnce();
//     expect(mockStdout).toHaveBeenCalledWith('::error::To append new deny lints, use the `deny` action input.\n');

//     mockStdout.mockReset();

//     resetEnv();
//     setInput('check-args', '--all-features');

//     inputs = await getInputs();
//     expect(inputs).toBeNull();
//     expect(mockStdout).toHaveBeenCalledOnce();
//     expect(mockStdout).toHaveBeenCalledWith(
//         '::error::`--all-features` is replaced by the `all-features` argument when using the action.\n'
//     );
// });

// See: https://github.com/actions/toolkit/blob/a1b068ec31a042ff1e10a522d8fdf0b8869d53ca/packages/core/src/core.ts#L89
function getInputName(name: string) {
    return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: keyof Inputs, value: string) {
    process.env[name === 'github-token' ? getInputName('token') : getInputName(name)] = value;
}
