import _ from 'lodash'

export default class TaskTest {
  constructor ({
    description = '',
    shouldStop = false,
    shouldRun = false,
    shouldError = false,
    fromPlugins = [],
    toPlugins = [],
    content = []
  } = {}) {
    this.description = description
    this.shouldStop = shouldStop
    this.shouldRun = shouldRun
    this.shouldError = shouldError
    this.fromPlugins = _.cloneDeep(fromPlugins)
    this.toPlugins = _.cloneDeep(toPlugins)
    this.content = _.cloneDeep(content)
  }
}
