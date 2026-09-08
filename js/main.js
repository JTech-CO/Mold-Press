(function (M) {
  'use strict';
  const App = M.App,
    ErrorBoundary = M.UI.ErrorBoundary;
  M.load()
    .then(({ project, error }) => {
      ReactDOM.render(
        React.createElement(
          ErrorBoundary,
          null,
          React.createElement(App, { project: project, error: error })
        ),
        document.getElementById('root')
      );
    })
    .catch((error) => {
      document.getElementById('root').textContent = 'Mold Press: ' + error.message;
    });
})(window.MP);
