(function (M) {
  'use strict';
  const { R, createRef, Icon, Button, fmt } = M.UI;
  const V = M.V;
  class ErrorBoundary extends R.Component {
    constructor(p) {
      super(p);
      this.state = { error: null };
    }
    componentDidCatch(error, info) {
      console.error(error, info);
      this.setState({ error });
    }
    render() {
      if (this.state.error)
        return React.createElement(
          'div',
          { className: 'fatal' },
          React.createElement('h1', null, 'Mold Press'),
          React.createElement('h2', null, '\uB80C\uB354\uB9C1 \uC624\uB958 / Rendering error'),
          React.createElement('p', null, this.state.error.message),
          React.createElement(
            'button',
            {
              onClick: () => {
                try {
                  const p = localStorage.getItem(M.STORAGE);
                  if (p) M.download('mold-press-recovery.txt', p, 'text/plain');
                } catch {}
              }
            },
            '\uC800\uC7A5 \uB370\uC774\uD130 \uBC31\uC5C5 / Back up saved data'
          ),
          React.createElement(
            'button',
            { onClick: () => location.reload() },
            '\uB2E4\uC2DC \uC5F4\uAE30 / Reload'
          )
        );
      return this.props.children;
    }
  }
  M.UI.ErrorBoundary = ErrorBoundary;
})(window.MP);
