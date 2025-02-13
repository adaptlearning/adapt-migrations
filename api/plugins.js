import { deferOrRunWrap, successStopOrErrorWrap } from '../lib/lifecycle.js'
const VERSION_CHECK = /^\d+\.\d+\.\d+$/

export function removePlugin (description, config) {
  return deferOrRunWrap(function (context) {
    return successStopOrErrorWrap('removePlugin', description, async () => {
      if (!description || !config) throw new Error('removePlugin - incorrectly configured')

      context.fromPlugins = context.fromPlugins.filter(plugin => plugin.name !== config.name)

      return true
    })
  }, { description, type: 'action' })
};

export function addPlugin (description, config) {
  return deferOrRunWrap(function (context) {
    return successStopOrErrorWrap('addPlugin', description, async () => {
      if (!description || !config) throw new Error('addPlugin - incorrectly configured')
      if (!VERSION_CHECK.test(config.version)) throw new Error(`addPlugin - invalid version number ${config.version}`)

      const newPlugin = context.toPlugins.find(plugin => (plugin.name === config.name))
      if (!newPlugin) throw new Error(`addPlugin - ${config.name} not found`)
      context.fromPlugins.push(newPlugin)

      return true
    })
  }, { description, type: 'action' })
};

export function updatePlugin (description, config) {
  return deferOrRunWrap(function (context) {
    return successStopOrErrorWrap('updatePlugin', description, async () => {
      if (!description || !config) throw new Error('updatePlugin - incorrectly configured')
      if (!VERSION_CHECK.test(config.version)) throw new Error(`updatePlugin - invalid version number ${config.version}`)

      context.fromPlugins.forEach(plugin => {
        if (plugin.name !== config.name) return
        plugin.version = config.version
        if (!config.framework) return
        plugin.framework = config.framework
      })

      return true
    })
  }, { description, type: 'action' })
};
