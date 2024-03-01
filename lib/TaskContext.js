export default class TaskContext {
  constructor ({
    hasErrored = false,
    hasStopped = false,
    hasRun = false,
    fromPlugins = null,
    originalFromPlugins = null,
    toPlugins = null,
    data = null,
    journal = null,
    errors = []
  } = {}) {
    this.hasErrored = hasErrored
    this.hasStopped = hasStopped
    this.hasRun = hasRun
    this.fromPlugins = fromPlugins
    this.originalFromPlugins = originalFromPlugins
    this.toPlugins = toPlugins
    this.data = data
    this.journal = journal
    this.errors = errors

    if (!this.originalFromPlugins) this.originalFromPlugins = JSON.parse(JSON.stringify(fromPlugins))
  }

  get lastError () {
    return this.errors[this.errors.length - 1]
  }
}
