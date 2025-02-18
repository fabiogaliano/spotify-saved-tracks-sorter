Basics
Setup
The intro and outro functions will print a message to begin or end a prompt session, respectively.

import { intro, outro } from '@clack/prompts';

intro(`create-my-app`);
// Do stuff
outro(`You're all set!`);
Cancellation
The isCancel function is a guard that detects when a user cancels a question with CTRL + C. You should handle this situation for each prompt, optionally providing a nice cancellation message with the cancel utility.

import { isCancel, cancel, text } from '@clack/prompts';

const value = await text({
message: 'What is the meaning of life?',
});

if (isCancel(value)) {
cancel('Operation cancelled.');
process.exit(0);
}
Components
Text
The text component accepts a single line of text.

import { text } from '@clack/prompts';

const meaning = await text({
message: 'What is the meaning of life?',
placeholder: 'Not sure',
initialValue: '42',
validate(value) {
if (value.length === 0) return `Value is required!`;
},
});
Confirm
The confirm component accepts a yes or no answer. The result is a boolean value of true or false.

import { confirm } from '@clack/prompts';

const shouldContinue = await confirm({
message: 'Do you want to continue?',
});
Select
The select component allows a user to choose one value from a list of options. The result is the value prop of a given option.

import { select } from '@clack/prompts';

const projectType = await select({
message: 'Pick a project type.',
options: [
{ value: 'ts', label: 'TypeScript' },
{ value: 'js', label: 'JavaScript' },
{ value: 'coffee', label: 'CoffeeScript', hint: 'oh no' },
],
});
Multi-Select
The multiselect component allows a user to choose many values from a list of options. The result is an array with all selected value props.

import { multiselect } from '@clack/prompts';

const additionalTools = await multiselect({
message: 'Select additional tools.',
options: [
{ value: 'eslint', label: 'ESLint', hint: 'recommended' },
{ value: 'prettier', label: 'Prettier' },
{ value: 'gh-action', label: 'GitHub Action' },
],
required: false,
});
Spinner
The spinner component surfaces a pending action, such as a long-running download or dependency installation.

import { spinner } from '@clack/prompts';

const s = spinner();
s.start('Installing via npm');
// Do installation here
s.stop('Installed via npm');
Utilities
Grouping
Grouping prompts together is a great way to keep your code organized. This accepts a JSON object with a name that can be used to reference the group later. The second argument is an optional but has a onCancel callback that will be called if the user cancels one of the prompts in the group.

import \* as p from '@clack/prompts';

const group = await p.group(
{
name: () => p.text({ message: 'What is your name?' }),
age: () => p.text({ message: 'What is your age?' }),
color: ({ results }) =>
p.multiselect({
message: `What is your favorite color ${results.name}?`,
options: [
{ value: 'red', label: 'Red' },
{ value: 'green', label: 'Green' },
{ value: 'blue', label: 'Blue' },
],
}),
},
{
// On Cancel callback that wraps the group
// So if the user cancels one of the prompts in the group this function will be called
onCancel: ({ results }) => {
p.cancel('Operation cancelled.');
process.exit(0);
},
}
);

console.log(group.name, group.age, group.color);
Tasks
Execute multiple tasks in spinners.

await p.tasks([
{
title: 'Installing via npm',
task: async (message) => {
// Do installation here
return 'Installed via npm';
},
},
]);
Logs
import { log } from '@clack/prompts';

log.info('Info!');
log.success('Success!');
log.step('Step!');
log.warn('Warn!');
log.error('Error!');
log.message('Hello, World', { symbol: color.cyan('~') });
Stream
When interacting with dynamic LLMs or other streaming message providers, use the stream APIs to log messages from an iterable, even an async one.

import { stream } from '@clack/prompts';

stream.info((function _() { yield 'Info!'; })());
stream.success((function _() { yield 'Success!'; })());
stream.step((function _() { yield 'Step!'; })());
stream.warn((function _() { yield 'Warn!'; })());
stream.error((function _() { yield 'Error!'; })());
stream.message((function _() { yield 'Hello'; yield ", World" })(), { symbol: color.cyan('~') });
