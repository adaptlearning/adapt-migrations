import Task from '../lib/Task.js'

export function getConfig () {
  return Task.current.context.content.find(({ _type, __path__ }) => _type === 'config' || __path__.endsWith('config.json'))
}

export function getCourse() {
  return Task.current.context.content.find(({ _type }) => _type === 'course');
}

export function getComponents(componentName) {
  return Task.current.context.content.filter(({ _component }) => _component === componentName);
}
