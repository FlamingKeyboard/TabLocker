// Mock implementation of preact
const h = jest.fn((type, props, ...children) => ({
  type,
  props: props || {},
  children: children.length ? children : undefined
}));

const Fragment = Symbol('Fragment');

const Component = class Component {
  constructor(props) {
    this.props = props;
    this.state = {};
  }
  
  setState(state) {
    this.state = { ...this.state, ...state };
  }
  
  render() {
    return null;
  }
};

module.exports = {
  h,
  Fragment,
  Component
};
