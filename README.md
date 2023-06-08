# adapt-migrations

### Commands API
https://github.com/cgkineo/adapt-migrations/blob/master/api/commands.js
* `capture({ cwd, data, fromPlugins })` - captures current plugins and data
* `migrate({ cwd, toPlugins })` - migrates data from capture to new plugins
* `test({ cwd })` - tests the migrations with dummy data

### Migration script API
Functions:
* `describe(description, describeFunction)` Describe a migration
* `whereData(description, dataFilterFunction)` Limit when the migration runs, return true/false/throw Error
* `whereFromPlugin(description, fromPluginFilterFunction)` Limit when the migration runs, return true/false/throw Error
* `whereToPlugin(description, toPluginFilterFunction)` Limit when the migration runs, return true/false/throw Error
* `checkData(dataFunction)` Check data, return true/false/throw Error
* `mutateData(dataFunction)` Change data, return true/false/throw Error
* `throwError(description)` Throw an error
* `testSuccessWhere({ fromPlugins, toPlugins, data })` Supply some tests data which should end in success
* `testStopWhere({ fromPlugins, toPlugins, data })` Supply some tests data which should end prematurely
* `testErrorWhere({ fromPlugins, toPlugins, data })` Supply some tests data which will trigger an error

Arguments:
* `describeFunction = () => {}` Function body has a collection of migration script functions
* `dataFilterFunction = data => {}` Function body should return true/false/throw Error
* `fromPluginFilterFunction = fromPlugins => {}` Function body should return true/false/throw Error
* `toPluginFilterFunction = toPlugins => {}` Function body should return true/false/throw Error
* `dataFunction = data => { }` Function body should mutate or check the data, returning true/false/throw Error
* `fromPlugins = [{ name: 'quickNav , version: '1.0.0' }]` Test data describing the original plugins
* `toPlugins = [{ name: 'pageNav , version: '1.0.0' }]` Test data describing the destination plugins
* `data = [{ _id: 'c-05, ... }]` Test data for the course content

### Example migration script
```js
import { describe, whereData, whereFromPlugin, whereToPlugin, mutateData, checkData, throwError, ifErroredAsk, testSuccessWhere, testErrorWhere, testStopWhere } from 'adapt-migrations';

describe('add "ollie" to displayTitle where exists', async () => {
  whereData('has configured displayTitles', async data => {
    return data.some(({ displayTitle }) => displayTitle);
  });
  mutateData('change displayTitle', async data => {
    const itemsWithDisplayTitle = data.filter(({ displayTitle }) => displayTitle);
    itemsWithDisplayTitle.forEach(item => (item.displayTitle += ' ollie'));
    return true;
  });
  checkData('check everything is ok', async data => {
    const isInvalid = data.some(({ displayTitle }) => displayTitle && !String(displayTitle).endsWith(' ollie'));
    if (isInvalid) throw new Error('found displayTitle without ollie at the end');
    return true;
  });
});

describe('quicknav to pagenav', async () => {
  whereFromPlugin('quicknav v1.0.0', { name: 'quicknav', version: '1.0.0' });
  whereToPlugin('pagenav v1.0.0', { name: 'pagenav', version: '1.0.0' });
  whereData('has configured quicknavs', async data => {
    return data.some(({ _component }) => _component === 'quicknav');
  });
  mutateData('change _component name', async data => {
    const quicknavs = data.filter(({ _component }) => _component === 'quicknav');
    quicknavs.forEach(item => (item._component = 'pagenav'));
    return true;
  });
  checkData('check everything is ok', async data => {
    const isInvalid = data.some(({ isInvalid }) => isInvalid);
    if (isInvalid) throw new Error('found invalid data attribute');
    return true;
  });
  // TODO: handle errors with question, allow to run without ui
  // ifErroredAsk({ question: 'Skip error', yes: 'Yes', no: 'No', defaultSkipError: true });
  // TODO: modify stack traces one errors to refer to the original migration script rather than the cached one,keep map of cached files to original files
  testSuccessWhere('Valid plugins and data', {
    fromPlugins: [{ name: 'quicknav', version: '1.0.0' }],
    toPlugins: [{ name: 'pagenav', version: '1.0.0' }],
    data: [{ _component: 'quicknav' }]
  });
  testStopWhere('Invalid data', {
    fromPlugins: [{ name: 'quicknav', version: '1.0.0' }],
    toPlugins: [{ name: 'pagenav', version: '1.0.0' }],
    data: [{ _component: 'quicknav1' }]
  });
  testStopWhere('Invalid origin plugins', {
    fromPlugins: [{ name: 'quicknav', version: '0.1.0' }],
    toPlugins: [{ name: 'pagenav', version: '0.1.0' }],
    data: [{ _component: 'quicknav' }]
  });
  testStopWhere('Invalid destination plugins', {
    data: [{ _component: 'quicknav' }],
    fromPlugins: [{ name: 'quicknav', version: '1.0.0' }],
    toPlugins: [{ name: 'pagenav', version: '0.1.0' }]
  });
  testErrorWhere('Has invalid configuration', {
    fromPlugins: [{ name: 'quicknav', version: '1.0.0' }],
    toPlugins: [{ name: 'pagenav', version: '1.0.0' }],
    data: [{ _component: 'quicknav', isInvalid: true }]
  });
});

describe('where quicknav is weirdly configured', async () => {
  checkData('check everything is ok', async data => {
    const isInvalid = data.some(({ isInvalid }) => isInvalid);
    if (isInvalid) throw new Error('Something went wrong');
    return true;
  });
  throwError('this is an error');
});
```

### Example grunt task
```js
module.exports = function(grunt) {

  const Helpers = require('../helpers')(grunt);

  grunt.registerTask('migration', 'Migrate from one verion to another', function(mode) {
    const next = this.async();
    (async function() {
      const migrations = await import('adapt-migrations');
      const framework = Helpers.getFramework();
      grunt.log.ok(`Using ${framework.useOutputData ? framework.outputPath : framework.sourcePath} folder for course data...`);

      const plugins = framework.getPlugins().getAllPackageJSONFileItems().map(fileItem => fileItem.item);

      if (mode === 'capture') {
        // TODO: capture all languages and not just the first
        const data = framework.getData().languages[0].getAllFileItems().map(fileItem => fileItem.item);
        await migrations.capture({ data, fromPlugins: plugins });
        return next();
      }

      if (mode === 'migrate') {
        await migrations.migrate({ toPlugins: plugins });
        return next();
      }

      if (mode === 'test') {
        await migrations.test();
        return next();
      }
    })();
  });

};
```
```sh
grunt migration:capture # captures current plugins and data
grunt migration:migrate # migrates data from capture to new plugins
grunt migration:test # tests the migrations with dummy data
```
