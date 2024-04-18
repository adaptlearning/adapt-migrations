// Example grunt task

module.exports = function (grunt) {

  const Helpers = require('../helpers')(grunt);
  const globs = require('globs');
  const path = require('path');
  const fs = require('fs-extra');
  const _ = require('underscore');

  function unix(path) {
    return path.replace(/\\/g, '/');
  }

  function dressPathIndex(fileItem) {
    return {
      ...fileItem.item,
      __index__: fileItem.index,
      __path__: unix(fileItem.file.path)
    };
  }

  function undressPathIndex(object) {
    const clone = { ...object };
    delete clone.__index__;
    delete clone.__path__;
    return clone;
  }

  grunt.registerTask('migration', 'Migrate from on verion to another', function (mode) {
    const next = this.async();
    const buildConfig = Helpers.generateConfigData();
    const fileNameIncludes = grunt.option('file');

    (async function () {
      const migrations = await import('adapt-migrations');

      const cwd = process.cwd();
      const outputPath = path.join(cwd, './migrations/');
      const cache = new migrations.CacheManager();
      const cachePath = await cache.getCachePath({
        outputPath: buildConfig.outputdir,
        tempPath: outputPath
      });

      const framework = Helpers.getFramework();
      grunt.log.ok(`Using ${framework.useOutputData ? framework.outputPath : framework.sourcePath} folder for course data...`);

      const plugins = framework.getPlugins().getAllPackageJSONFileItems().map(fileItem => fileItem.item);
      const migrationScripts = Array.from(await new Promise(resolve => {
        globs([
          '*/*/migrations/**/*.js',
          'core/migrations/**/*.js'
        ], { cwd: path.join(cwd, './src/'), absolute: true }, (err, files) => resolve(err ? null : files));
      })).filter(filePath => {
        if (!fileNameIncludes) return true;
        return filePath.includes(fileNameIncludes);
      });

      await migrations.load({
        cachePath,
        scripts: migrationScripts
      });

      if (mode === 'capture') {
        if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);
        const languages = framework.getData().languages.map((language) => language.name);
        const languageFile = path.join(outputPath, 'captureLanguages.json');
        fs.writeJSONSync(languageFile, languages);
        languages.forEach(async (language, index) => {
          const data = framework.getData();
          // get all items from config.json file and all language files, append __index__ and __path__ to each item
          const content = [
            ...data.configFile.fileItems,
            ...data.languages[index].getAllFileItems()
          ].map(dressPathIndex);
          const captured = await migrations.capture({ content, fromPlugins: plugins });
          const outputFile = path.join(outputPath, `capture_${language}.json`);
          fs.writeJSONSync(outputFile, captured);
        });

        return next();
      }

      if (mode === 'migrate') {
        try {
          const languagesFile = path.join(outputPath, 'captureLanguages.json');
          const languages = fs.readJSONSync(languagesFile);

          for (const language of languages) {
            const Journal = migrations.Journal;
            if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);
            const outputFile = path.join(outputPath, `capture_${language}.json`);
            const { content, fromPlugins } = fs.readJSONSync(outputFile);
            const originalFromPlugins = JSON.parse(JSON.stringify(fromPlugins));
            const journal = new Journal({
              data: {
                content,
                fromPlugins,
                originalFromPlugins,
                toPlugins: plugins
              },
              supplementEntry: (entry, data) => {
                entry._id = data[entry.keys[0]][entry.keys[1]]?._id ?? '';
                entry._type = data[entry.keys[0]][entry.keys[1]]?._type ?? '';
                if (entry._type && data[entry.keys[0]][entry.keys[1]]?.[`_${entry._type}`]) {
                  entry[`_${entry._type}`] = data[entry.keys[0]][entry.keys[1]]?.[`_${entry._type}`] ?? '';
                }
                return entry;
              }
            });
            await migrations.migrate({ journal });
            console.log(journal.entries);

            // group all content items by path
            const outputFilePathItems = _.groupBy(content, '__path__');
            // sort items inside each path
            Object.values(outputFilePathItems).forEach(outputFile => outputFile.sort((a, b) => a.__index__ - b.__index__));
            // get paths
            const outputFilePaths = Object.keys(outputFilePathItems);

            outputFilePaths.forEach(outputPath => {
              const outputItems = outputFilePathItems[outputPath];
              if (!outputItems?.length) return;
              const isSingleObject = (outputItems.length === 1 && outputItems[0].__index__ === null);
              const stripped = isSingleObject
                ? undressPathIndex(outputItems[0]) // config.json, course.json
                : outputItems.map(undressPathIndex); // contentObjects.json, articles.json, blocks.json, components.json
              fs.writeJSONSync(outputPath, stripped, { replacer: null, spaces: 2 });
            });
          }
        } catch (error) {
          console.log(error.stack);
        }
        return next();
      }

      if (mode === 'test') {
        await migrations.test();
        return next();
      }

      return next();
    })();
  });
};
