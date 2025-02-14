import Task from '../lib/Task.js'

function getContent() {
  return Task.current.context.content;
}

export function getConfig () {
  return getContent().find(({ _type, __path__ }) => _type === 'config' || __path__.endsWith('config.json'))
}

export function getCourse() {
  return getContent().find(({ _type }) => _type === 'course');
}

export function getComponents(componentName) {
  return getContent().filter(({ _component }) => _component === componentName);
}
