# adapt-migrations

### Todos
https://github.com/cgkineo/adapt-migrations/issues/1

### Commands API
https://github.com/cgkineo/adapt-migrations/blob/master/api/commands.js
* `load({ cwd, cachePath, scripts })` - loads all migration tasks
* `capture({ cwd, content, fromPlugins })` - captures current plugins and content
* `migrate({ cwd, toPlugins })` - migrates content from capture to new plugins
* `test({ cwd })` - tests the migrations with dummy content

### Migration script API
Functions:
* `describe(description, describeFunction)` Describe a migration
* `whereContent(description, contentFilterFunction)` Limit when the migration runs, return true/false/throw Error
* `whereFromPlugin(description, fromPluginFilterFunction)` Limit when the migration runs, return true/false/throw Error
* `whereToPlugin(description, toPluginFilterFunction)` Limit when the migration runs, return true/false/throw Error
* `mutateContent(contentFunction)` Change content, return true/false/throw Error
* `checkContent(contentFunction)` Check content, return true/false/throw Error
* `addPlugin(description, pluginConfig)` Add a plugin
* `updatePlugin(description, pluginConfig)` Update a plugin
* `removePlugin(description, pluginConfig)` Remove a plugin
* `throwError(description)` Throw an error
* `testSuccessWhere({ fromPlugins, toPlugins, content })` Supply some tests content which should end in success
* `testStopWhere({ fromPlugins, toPlugins, content })` Supply some tests content which should end prematurely
* `testErrorWhere({ fromPlugins, toPlugins, content })` Supply some tests content which will trigger an error

Arguments:
* `describeFunction = () => {}` Function body has a collection of migration script functions
* `contentFilterFunction = content => {}` Function body should return true/false/throw Error
* `fromPluginFilterFunction = fromPlugins => {}` Function body should return true/false/throw Error
* `toPluginFilterFunction = toPlugins => {}` Function body should return true/false/throw Error
* `contentFunction = content => { }` Function body should mutate or check the content, returning true/false/throw Error
* `fromPlugins = [{ name: 'quickNav , version: '1.0.0' }]` Test data describing the original plugins
* `toPlugins = [{ name: 'pageNav , version: '1.0.0' }]` Test data describing the destination plugins
* `pluginConfig = { name: 'pageNav , version: '1.0.0' }` Describes a plugin
* `content = [{ _id: 'c-05, ... }]` Test content for the course content

### Grunt Commands
```sh
grunt migration:capture # captures current plugins and content
# do plugin/fw updates
grunt migration:migrate # migrates content from capture to new plugins
grunt migration:test # tests the migrations with dummy content
grunt migration:test --file=adapt-contrib-text/migrations/text.js # tests the migrations with dummy content
```

### Description of how
The whole `describe` function block is executed as a normal function, from top to bottom, always. It does not return early.

When the `describe` function block is executed, we're effectively using javascript function calls (the step functions) to define a single migration script (task) and its steps and then that migration script (task, and its steps) is run in part, to ascertain if it is applicable (using the where section), or in full when it is applicable by running through every step.

The step functions (whereFromPlugins, mutateContent, etc) have two phases:

#### Step function phases
1. Task definition phase: Adding themselves as steps inside a task for later execution
```js
describe(description, async () => { // Make a task
  // where/selection/applicability section
  whereFromPlugin(description, version) // Define as step 1 in the task
  whereContent(description, () => {}) // Define as step 2 in the task
  // mutation section to make changes
  mutateContent(async content => {}) // Define as step 3 in the task
  // checking section to ensure changes, content is immutable 
  checkContent(async content => {}) // Define as step 4 in the task
  // plugin progression section
  addPlugin(description, { name, version }) // Define as step 5 in the task
  updatePlugin(description, { name, version }) // Define as step 6 in the task
  removePlugin(description, { name, version }) // Define as step 7 in the task
  // testing data for grunt migration:test
  testSuccessWhere({ fromPlugins, toPlugins, content })
  testStopWhere({ fromPlugins, toPlugins, content })
  testErrorWhere({ fromPlugins, toPlugins, content })
})
```
2. Execution phase: When used inside any other executing utility function block
```js
describe(name, async () => {
  mutateContent(name, async content => { // Execute the task step 1
    if (whereFromPlugin(name, version)) { // Execute the function immediately
      // the plugin version is matched
    }
  })
}) 
```

It's these two phases which decouple the definition of and execution of migration scripts, whilst using the same block of javascript. This was the simplest form I could think of, without having too many rules or nesting but whilst also providing flexibility, imply an order and convey concise meaning in as few words as possible.

We define variables and steps in the definition phase of the migration script (task) for later execution. The describe function doesn't return early at `whereFromPlugins`, both because functions can't implicitly return early, and because the function is executed in a definition phase, where it's just adding a description of itself to a task for later use.

`whereFromPlugins` is a single step in a task, it will be executed multiple times as the migrations progress, this is to find out whether the task is applicable and whether the task should proceed through all of the steps until conclusion. 

Tasks and steps have three results: success (true), stop (false) or error (throw Error). Using those return values and having some of the step functions marked up as "where" functions, we can selectively define and execute a variety of migrations scripts, for a variety of courses, with a fun array of predictable outcomes.

References:
Migration files are loaded: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/Task.js#L293-L296
Capturing the description and callback of each describe function call to make a new task: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/api/describe.js#L11
Each of the describe blocks in the file are executed one by one: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/Task.js#L297-L302
The step functions are executed and deferred: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/api/where.js#L4-L10
The step functions add themselves as tests or steps to the currently loading task: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/lifecycle.js#L23
After the loading phase, on each run of the migrations scripts, applicable tasks are selected for execution until no more tasks can be executed: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/Task.js#L320-L323
Tasks are applicable if all of their where steps come back success: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/Task.js#L184-L197
The applicable tasks are run: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/Task.js#L330-L336
The last success, stop or error step determines if the task failed or completed successfully or stopped because it wasn't applicable: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/lib/lifecycle.js#L35-L41
Here is checkContent, freezing the data and dealing with its result: https://github.com/adaptlearning/adapt-migrations/blob/1b156d8dad82f370c974f630adb3d58eaa8517b8/api/data.js#L13-L24
