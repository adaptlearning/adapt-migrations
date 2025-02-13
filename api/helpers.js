import Task from '../lib/Task.js'

function getContext() {
  return Task.current.context;
}

export function getConfig () {
  return getContext().content.find(({ _type, __path__ }) => _type === 'config' || __path__.endsWith('config.json'))
}

export function getCourse() {
  return getContext().content.find(({ _type }) => _type === 'course');
}

export function getComponents(componentName) {
  return getContext().content.filter(({ _component }) => _component === componentName);
}
