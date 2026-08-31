import semver from 'semver'
import { deferOrRunWrap, successStopOrErrorWrap } from '../lib/lifecycle.js'

export function whereContent (description, callback) {
  return deferOrRunWrap(({ content }) => {
    return successStopOrErrorWrap('whereContent', description, async () => {
      return callback(content)
    })
  }, { description, type: 'where' })
};

export function whereFromPlugin (description, callbackOrConfig) {
  return deferOrRunWrap(({ fromPlugins }) => {
    return successStopOrErrorWrap('whereFromPlugin', description, async () => {
      const isCallback = (typeof callbackOrConfig === 'function')
      if (isCallback) {
        const callback = callbackOrConfig
        return callback(fromPlugins)
      }
      const config = callbackOrConfig
      return fromPlugins.some(plugin => {
        if (config.name && plugin.name !== config.name) return false
        if (config.version && !semver.satisfies(plugin.version, config.version, { includePrerelease: true })) return false
        return true
      })
    })
  }, { description, type: 'where' })
};

export function whereToPlugin (description, callbackOrConfig) {
  return deferOrRunWrap(({ toPlugins }) => {
    return successStopOrErrorWrap('whereToPlugin', description, async () => {
      const isCallback = (typeof callbackOrConfig === 'function')
      if (isCallback) {
        const callback = callbackOrConfig
        return callback(toPlugins)
      }
      const config = callbackOrConfig
      return toPlugins.some(plugin => {
        if (config.name && plugin.name !== config.name) return false
        if (config.version && !semver.satisfies(plugin.version, config.version, { includePrerelease: true })) return false
        return true
      })
    })
  }, { description, type: 'where' })
};
