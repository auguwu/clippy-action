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

import { lazy } from '@noelware/utils';

export const os = lazy(() => {
    switch (process.platform) {
        case 'aix':
            return 'IBM AIX';

        case 'android':
            return 'Android';

        case 'darwin':
            return 'macOS';

        case 'freebsd':
            return 'FreeBSD';

        case 'haiku':
            return 'HaikuOS';

        case 'linux':
            return 'Linux';

        case 'openbsd':
            return 'OpenBSD';

        case 'sunos':
            return 'SunOS';

        case 'win32':
        case 'cygwin':
            return 'Windows';

        case 'netbsd':
            return 'NetBSD';

        default:
            return 'Unknown';
    }
});

export const arch = lazy(() => {
    switch (process.arch) {
        case 'arm':
            return 'ARM';

        case 'arm64':
            return 'ARM64';

        case 'ia32':
            return 'x86';

        case 'x64':
            return 'x86_64';

        default:
            return 'Unknown';
    }
});
