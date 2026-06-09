import readline from 'readline';

/**
 * Read a single line from the terminal without echoing it, for secrets like API keys.
 * If stdin is not a TTY (e.g. piped: `echo $KEY | simplified auth:login ci`), read the piped
 * value directly without prompting.
 */
export function promptHidden(prompt: string): Promise<string> {
  const input = process.stdin;

  if (!input.isTTY) {
    return readPiped(input);
  }

  return new Promise((resolve) => {
    const output = process.stdout;
    const rl = readline.createInterface({ input, output, terminal: true });

    // Mute echo: swallow everything readline would otherwise write after the prompt itself.
    let promptShown = false;
    const realWrite = (output.write as unknown as (...args: unknown[]) => boolean).bind(output);
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (!promptShown) {
        realWrite(prompt);
        promptShown = true;
      }
      // After the prompt is shown, drop keystroke echoes.
    };

    rl.question(prompt, (answer) => {
      rl.close();
      realWrite('\n');
      resolve(answer);
    });
  });
}

/** Read all of stdin (piped input) and return the first non-empty line. */
function readPiped(input: NodeJS.ReadStream): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    input.setEncoding('utf8');
    input.on('data', (chunk) => (data += chunk));
    input.on('end', () => resolve(data.split('\n')[0] ?? ''));
  });
}
