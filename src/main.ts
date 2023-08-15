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

import { endGroup, error, info, startGroup } from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { getInputs } from './inputs';
import * as clippy from './clippy';
import * as osInfo from './os-info';
import { which } from '@actions/io';

async function main() {
    const inputs = await getInputs();
    if (inputs === null) {
        process.exit(1);
    }

    const client = getOctokit(inputs['github-token']);

    startGroup('Checking if `cargo` exists...');
    let cargoPath: string;

    try {
        cargoPath = await which('cargo', true);
        info(`Cargo exists in path [${cargoPath}]`);
    } catch (e) {
        error("Tool doesn't exist, please add a valid Rust toolchain.");
        process.exit(1);
    } finally {
        endGroup();
    }

    const ref = context.payload.pull_request !== undefined ? context.payload.pull_request.head.sha : context.sha;
    let hasPerms = true;
    let data: any;

    try {
        const { data: _data } = await client.request('GET /repos/{owner}/{repo}/commits/{ref}/check-runs', {
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref
        });

        data = _data;
    } catch (ex) {
        error("clippy-action doesn't have permissions to view Check Runs, disabling");
        hasPerms = false;
        data = null;
    }

    let id: number | null = null;
    if (hasPerms && !data.check_runs.filter((s) => s.name.toLowerCase() !== 'clippy').length) {
        // Create a check
        const { data } = await client.request('POST /repos/{owner}/{repo}/check-runs', {
            owner: context.repo.owner,
            repo: context.repo.repo,

            name: 'Clippy',
            head_sha: ref,
            status: 'in_progress'
        });

        id = data.id;
    }

    const [exitCode, pieces] = await clippy.getClippyOutput(inputs, cargoPath);
    await clippy.renderMessages(pieces);

    const annotations = clippy.kDefaultRenderer.annotations;
    if (hasPerms && id !== null) {
        const os = osInfo.os.get();
        const arch = osInfo.arch.get();
        await client.request('PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}', {
            check_run_id: id,
            owner: context.repo.owner,
            repo: context.repo.repo,
            conclusion: exitCode === 0 ? 'success' : 'failure',
            output:
                exitCode === 0
                    ? {
                          title: `Clippy (${os} ${arch})`,
                          summary: 'Clippy ran successfully!',
                          annotations: annotations.map((anno) => ({
                              annotation_level: anno.level === 'error' ? ('failure' as const) : ('warning' as const),
                              path: anno.file!,
                              start_line: anno.startLine!,
                              end_line: anno.endLine!,
                              start_column: anno.startColumn,
                              end_column: anno.endColumn,
                              raw_details: anno.rendered,
                              message: anno.title!
                          }))
                      }
                    : {
                          title: `Clippy (${os} ${arch})`,
                          summary: `Running \`cargo clippy\` failed with exit code ${exitCode}`,
                          annotations: annotations.map((anno) => ({
                              annotation_level: anno.level === 'error' ? ('failure' as const) : ('warning' as const),
                              path: anno.file!,
                              start_line: anno.startLine!,
                              end_line: anno.endLine!,
                              start_column: anno.startColumn,
                              end_column: anno.endColumn,
                              raw_details: anno.rendered,
                              message: anno.title!
                          }))
                      }
        });
    }

    info(`Clippy exited with code ${exitCode}`);
    process.exitCode = exitCode;
}

main().catch((ex) => {
    error(`Unable to run @augu/clippy-action:\n${ex}`);
    process.exit(1);
});
