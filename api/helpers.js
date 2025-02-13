export function getConfig (content) {
  return content.find(({ _type, __path__ }) => _type === 'config' || __path__.endsWith('config.json'))
}

export function getCourse(content) {
  return content.find(({ _type }) => _type === 'course');
}

export function getComponents(content, componentName) {
  return content.filter(({ _component }) => _component === componentName);
}
