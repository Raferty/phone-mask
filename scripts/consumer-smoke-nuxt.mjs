import { execFile, spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: {
        ...process.env,
        CI: '1',
      },
      stdio: 'inherit',
    });
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`${command} ${args.join(' ')} timed out after ${options.timeoutMs}ms`));
        }, options.timeoutMs)
      : null;

    child.on('error', reject);
    child.on('exit', (code) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

function read(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const child = execFile(command, args, {
      cwd: options.cwd ?? rootDir,
      env: {
        ...process.env,
        CI: '1',
      },
      maxBuffer: 1024 * 1024 * 20,
    });
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`${command} ${args.join(' ')} timed out after ${options.timeoutMs}ms`));
        }, options.timeoutMs)
      : null;

    child.stdout?.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      if (code === 0) {
        if (stderr) {
          process.stderr.write(stderr);
        }

        resolve(stdout);
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response.text();
      }
    } catch {
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    }
  }

  throw new Error(`Nuxt smoke server did not respond at ${url}`);
}

await run('npm', ['run', 'build']);
const fixtureDir = await mkdtemp(join(tmpdir(), 'phone-mask-nuxt-'));
const packOutput = await read('npm', ['pack', '--pack-destination', fixtureDir]);
const packageTarball = resolve(fixtureDir, packOutput.trim().split('\n').at(-1) ?? '');
const packageJson = {
  private: true,
  type: 'module',
  scripts: {
    build: 'nuxt build',
  },
  dependencies: {
    nuxt: 'latest',
    'phone-mask': `file:${packageTarball}`,
  },
};

await writeFile(join(fixtureDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
await writeFile(
  join(fixtureDir, 'nuxt.config.ts'),
  `export default defineNuxtConfig({
  ssr: true,
});
`,
);
await writeFile(
  join(fixtureDir, 'app.vue'),
  `<script setup lang="ts">
import { ref } from 'vue';
import { PhoneMaskInput, type PhoneCountryCode } from 'phone-mask';
import 'phone-mask/style.css';

const phone = ref('+420601123456');
const country = ref<PhoneCountryCode | null>('CZ');
</script>

<template>
  <main data-testid="nuxt-smoke">
    <PhoneMaskInput
      v-model="phone"
      v-model:country="country"
      show-country-selector
      country-name-locale="en"
    />
  </main>
</template>
`,
);

await run('npm', ['install', '--prefer-offline', '--no-audit', '--fund=false'], {
  cwd: fixtureDir,
  timeoutMs: 180000,
});
await run('npm', ['run', 'build'], { cwd: fixtureDir, timeoutMs: 180000 });

const port = String(4700 + Math.floor(Math.random() * 1000));
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: fixtureDir,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: port,
    NITRO_PORT: port,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout?.pipe(process.stdout);
server.stderr?.pipe(process.stderr);

try {
  const html = await waitForServer(`http://127.0.0.1:${port}/`);

  if (!html.includes('data-testid="nuxt-smoke"')) {
    throw new Error('Nuxt SSR output is missing the smoke marker.');
  }

  if (!html.includes('phone-mask-input')) {
    throw new Error('Nuxt SSR output is missing PhoneMaskInput markup.');
  }

  console.log('Nuxt consumer smoke passed.');
} finally {
  server.kill('SIGTERM');
}
