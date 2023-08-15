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

import { readFile, writeFile } from 'fs/promises';
import { relative, resolve } from 'path';
import * as prettier from 'prettier';
import { globby } from 'globby';
import getLogger from './util/log';
import assert from 'assert';
import run from './util/run';

const log = getLogger('prettier');
const ext = ['.json', '.yaml', '.yml', '.js', '.md', '.ts'] as const;

run(async () => {
    log.info('Resolving Prettier configuration...');

    const config = await prettier.resolveConfig(resolve(process.cwd(), '.prettierrc.json'));
    assert(config !== null, ".prettierrc.json doesn't exist?");

    const files = await globby(
        ext.map((f) => `**/*${f}`),
        {
            onlyFiles: true,
            throwErrorOnBrokenSymbolicLink: true,
            gitignore: true
        }
    );

    for (const file of files) {
        const start = Date.now();
        const fileInfo = await prettier.getFileInfo(file, {
            resolveConfig: true,
            ignorePath: resolve(__dirname, '..', '.prettierignore')
        });

        const contents = await readFile(file, 'utf-8');
        if (fileInfo.ignored || fileInfo.inferredParser === null) {
            continue;
        }

        log.await(`   ${relative(process.cwd(), file)}`);
        const source = await prettier.format(contents, {
            ...config,
            parser: fileInfo.inferredParser!
        });

        await writeFile(resolve(process.cwd(), file), source, { encoding: 'utf-8' });
        log.success(`   ${file} [${Date.now() - start}ms]`);
    }
});
