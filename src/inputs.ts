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

import { error, getInput, type InputOptions } from '@actions/core';
import z from 'zod';

const inputSchema = z.object({
    'all-features': z.boolean().default(false),
    forbid: z.array(z.string()).default([]),
    allow: z.array(z.string()).default([]),
    deny: z.array(z.string()).default([]),
    args: z.array(z.string()).default([]),
    warn: z.array(z.string()).default([])
});

export type Inputs = z.infer<typeof inputSchema>;

const truthy = new Set(['true', 'True', 'TRUE']);
const falsy = new Set(['false', 'False', 'FALSE']);

const getBooleanInput = (name: string, options: InputOptions) => {
    const value = getInput(name, options);
    if (!value) return false;
    if (truthy.has(value)) return true;
    if (falsy.has(value)) return false;

    throw new Error(
        `Value of key [${name}] didn't meet the Yaml 1.2 "Core Schema" specification (received: [${value}])`
    );
};

export const getInputs = (): Inputs | null => {
    const allFeatures = getBooleanInput('all-features', { trimWhitespace: true });
    const allow = getInput('allow', { trimWhitespace: true })
        .split(',')
        .map((s) => s.trim());

    const deny = getInput('deny', { trimWhitespace: true })
        .split(',')
        .map((s) => s.trim());

    const forbid = getInput('forbid', { trimWhitespace: true })
        .split(',')
        .map((s) => s.trim());

    const warn = getInput('forbid', { trimWhitespace: true })
        .split(',')
        .map((s) => s.trim());

    const args = getInput('args', { trimWhitespace: true })
        .split(',')
        .map((s) => s.trim());

    if (args.some((s) => s.startsWith('-W') || s.startsWith('--warning'))) {
        error('To append new warning lints, use the `warn` action input.');
        return null;
    }

    if (args.some((s) => s.startsWith('-D') || s.startsWith('--deny'))) {
        error('To append new deny lints, use the `deny` action input.');
        return null;
    }

    if (args.some((s) => s.startsWith('-F') || s.startsWith('--forbid'))) {
        error('To append new forbidden lints, use the `forbid` action input.');
        return null;
    }

    if (args.some((s) => s.startsWith('-A') || s.startsWith('--allow'))) {
        error('To append new allowed lints, use the `allow` action input.');
        return null;
    }

    return {
        'all-features': allFeatures,
        forbid,
        allow,
        deny,
        warn,
        args
    };
};
