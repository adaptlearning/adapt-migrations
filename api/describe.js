import Task from '../lib/Task.js'

export function describe (description, load) {
  console.log('describing', description)
  if (Task.current) {
    throw new Error(`Cannot nest describe statements: ${description}`)
  }
  // eslint-disable-next-line no-new
  new Task({ description, load })
};
