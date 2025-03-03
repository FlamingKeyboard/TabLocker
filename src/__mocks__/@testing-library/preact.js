// Mock implementation of @testing-library/preact
const render = jest.fn().mockReturnValue({
  container: document.createElement('div'),
  unmount: jest.fn(),
  rerender: jest.fn()
});

const screen = {
  getByText: jest.fn().mockImplementation((text) => {
    const element = document.createElement('div');
    element.textContent = text;
    return element;
  }),
  getByPlaceholderText: jest.fn().mockImplementation((text) => {
    const input = document.createElement('input');
    input.placeholder = text;
    return input;
  }),
  queryByText: jest.fn().mockImplementation((text) => {
    return null;
  }),
  getByRole: jest.fn().mockImplementation((role, options) => {
    const element = document.createElement('div');
    element.setAttribute('role', role);
    return element;
  })
};

const fireEvent = {
  click: jest.fn(),
  change: jest.fn()
};

const waitFor = jest.fn().mockImplementation((callback) => Promise.resolve(callback()));

module.exports = {
  render,
  screen,
  fireEvent,
  waitFor
};
