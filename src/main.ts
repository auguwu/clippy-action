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

import { error, group, debug } from '@actions/core';
import { getInputs } from './inputs';
import * as clippy from './clippy';
import { which } from '@actions/io';
import { exec } from '@actions/exec';

async function main() {
    const inputs = getInputs();
    if (inputs === null) {
        process.exit(1);
    }

    debug('Checking if `cargo` exists...');
    let cargoPath: string;

    try {
        cargoPath = await which('cargo', true);
    } catch (e) {
        error("Tool doesn't exist, please add a valid Rust toolchain.");
        process.exit(1);
    }

    group('Checking if `cargo clippy` is installed', async () => {
        const exitCode = await exec(cargoPath, ['clippy'], {
            windowsVerbatimArguments: true,
            ignoreReturnCode: true,
            silent: true
        });

        // TODO: should we install it?
        if (exitCode !== 0) {
            error('Clippy was not installed when a toolchain was installed. Please add it.');
        }
    });

    const [exitCode, pieces] = await clippy.getClippyOutput(inputs, cargoPath);
    clippy.renderMessages(pieces);

    process.exitCode = exitCode;
}

main().catch((ex) => {
    error(`Unable to run @augu/clippy-action:\n${ex}`);
    process.exit(1);
});
